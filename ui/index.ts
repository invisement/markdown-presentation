import EasyMDE from 'easymde';
import { marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';

// Load CodeMirror modes natively into the bundle for syntax highlighting in the editor
import 'https://esm.sh/codemirror@5/mode/javascript/javascript.js';
import 'https://esm.sh/codemirror@5/mode/css/css.js';
import 'https://esm.sh/codemirror@5/mode/python/python.js';
import 'https://esm.sh/codemirror@5/mode/xml/xml.js';
import 'https://esm.sh/codemirror@5/mode/htmlmixed/htmlmixed.js';
import 'https://esm.sh/codemirror@5/mode/shell/shell.js';

import 'https://esm.sh/codemirror@5/mode/shell/shell.js';

const renderer = new marked.Renderer();
const originalImage = renderer.image.bind(renderer);
renderer.image = (href, title, text) => {
    if (href && !href.match(/^(https?:|data:|blob:)/)) {
        return `<img data-src="${href}" alt="${text}" title="${title || ''}">`;
    }
    return originalImage(href, title, text);
};

marked.use({ renderer });
marked.use(gfmHeadingId());


// =============================================================
// Distribution Channel (detected once at startup)
// =============================================================

const DIST_CHANNEL = (() => {
    const el = document.getElementById('app-css');
    if (el.textContent) return 'standalone';
    if (el.href) return 'webapp';
    if (typeof chrome !== 'undefined' && chrome.runtime?.id) return 'browser-ext';
    return 'vscode-ext';
})();


// =============================================================
// Storage (IndexedDB)
// =============================================================

const dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open('mdpresenter', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('settings');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

const getSetting = async (key) => {
    const db = await dbPromise;
    return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const req = tx.objectStore('settings').get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
    });
};

const setSetting = async (key, value) => {
    const db = await dbPromise;
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put(value, key);
};


// =============================================================
// DOM references
// =============================================================

const contentDiv        = document.getElementById('content');
const detailsElement    = document.getElementById('details');
const refreshBtn        = document.getElementById('refreshBtn');
const cssInput          = document.getElementById('cssFile');
const jsInput           = document.getElementById('jsFile');
const customCssStyleTag = document.getElementById('custom-css');
const bgColorInput      = document.getElementById('bgColor');
const textColorInput    = document.getElementById('textColor');
const headerColorInput  = document.getElementById('headerColor');
const codeBgColorInput  = document.getElementById('codeBgColor');
const codeTextColorInput = document.getElementById('codeTextColor');
const fontSizeSlider    = document.getElementById('fontSize');
const maxWidthSlider    = document.getElementById('maxWidth');
const h3PageBreakCheckbox = document.getElementById('h3PageBreak');
const root = document.documentElement;

let markdownFileHandle = null;
let markdownDirHandle  = null;
let currentMarkdownFilePath = '';
let currentMarkdownSource = '';
const assetMap = {};


// =============================================================
// Settings (layered: default → user → document)
// =============================================================

const DEFAULTS = {
    bgColor: '#f5f5f5',
    textColor: '#333333',
    headerColor: '#005cc5',
    codeBgColor: '#ffffff',
    codeTextColor: '#24292e',
    fontSize: '18',
    maxWidth: '60',
    h3PageBreak: false
};

const getDocKey = () => {
    if (!markdownDirHandle || !markdownFileHandle) return null;
    return 'doc:' + markdownDirHandle.name + '/' + currentMarkdownFilePath;
};

const computeDelta = (base, current) => {
    const delta = {};
    for (const key of Object.keys(current))
        if (current[key] !== base[key]) delta[key] = current[key];
    return Object.keys(delta).length ? delta : null;
};

const getCurrentSettings = () => ({
    bgColor: bgColorInput.value,
    textColor: textColorInput.value,
    headerColor: headerColorInput.value,
    codeBgColor: codeBgColorInput.value,
    codeTextColor: codeTextColorInput.value,
    fontSize: fontSizeSlider.value,
    maxWidth: maxWidthSlider.value,
    h3PageBreak: h3PageBreakCheckbox.checked
});

const applySettings = (settings) => {
    bgColorInput.value = settings.bgColor; root.style.setProperty('--bg-color', settings.bgColor);
    textColorInput.value = settings.textColor; root.style.setProperty('--text-color', settings.textColor);
    headerColorInput.value = settings.headerColor; root.style.setProperty('--header-color', settings.headerColor);
    codeBgColorInput.value = settings.codeBgColor; root.style.setProperty('--code-bg-color', settings.codeBgColor);
    codeTextColorInput.value = settings.codeTextColor; root.style.setProperty('--code-text-color', settings.codeTextColor);
    fontSizeSlider.value = settings.fontSize; root.style.setProperty('--base-font-size', `${settings.fontSize}px`);
    maxWidthSlider.value = settings.maxWidth; document.body.style.maxWidth = `${settings.maxWidth}em`;
    h3PageBreakCheckbox.checked = settings.h3PageBreak;
};

const saveSettings = async () => {
    const docKey = getDocKey();
    if (!docKey) return;
    const userDelta = await getSetting('user') || {};
    const effective = { ...DEFAULTS, ...userDelta };
    const current = getCurrentSettings();
    const docDelta = computeDelta(effective, current);
    if (docDelta) setSetting(docKey, docDelta);
    else setSetting(docKey, null);
};

const saveAsUserDefault = async () => {
    const current = getCurrentSettings();
    const delta = computeDelta(DEFAULTS, current);
    setSetting('user', delta);
    const docKey = getDocKey();
    if (docKey) setSetting(docKey, null);
};

const restoreSettings = async () => {
    const userDelta = await getSetting('user') || {};
    const docKey = getDocKey();
    const docDelta = docKey ? (await getSetting(docKey) || {}) : {};
    applySettings({ ...DEFAULTS, ...userDelta, ...docDelta });
};


// =============================================================
// Rendering pipeline
// =============================================================

const renderDotDiagrams = async () => {
    const dotBlocks = contentDiv.querySelectorAll('.language-dot');
    if (!dotBlocks.length) return;
    
    try {
        const { Graphviz } = await import('graphviz');
        const graphviz = await Graphviz.load();
        dotBlocks.forEach(block => {
            try {
                const svgContent = graphviz.dot(block.textContent);
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
                const svg = svgDoc.querySelector('svg');
                if (svg) {
                    svg.style.maxWidth = '100%';
                    svg.style.height = 'auto';
                    svg.style.maxHeight = '60vh';
                    block.parentElement.replaceWith(svg);
                }
            } catch (err) {
                block.parentElement.insertAdjacentHTML('beforebegin', `<pre style="color:red">${err.message}</pre>`);
            }
        });
    } catch (e) {
        console.warn('Graphviz load failed', e);
    }
};

const renderMermaid = async () => {
    const nodes = contentDiv.querySelectorAll('.language-mermaid');
    if (!nodes.length) return;
    try {
        const m = await import('mermaid');
        const mermaidInstance = m.default || m.mermaid || m;
        mermaidInstance.initialize({ 
            startOnLoad: false, 
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'system-ui, sans-serif'
        });
        await mermaidInstance.run({ nodes });
        
        // Also constrain mermaid SVG sizes
        contentDiv.querySelectorAll('.language-mermaid svg').forEach(svg => {
            (svg as any).style.maxWidth = '100%';
            (svg as any).style.height = 'auto';
            (svg as any).style.maxHeight = '60vh';
        });
    } catch (e) {
        console.warn('Mermaid load failed', e);
    }
};

const resolveRelativeAssets = async () => {
    const embedded = document.getElementById('assets');
    const embeddedMap = embedded ? JSON.parse(embedded.textContent || '{}') : {};
    Object.values(assetMap).forEach(u => URL.revokeObjectURL(u));
    for (const key of Object.keys(assetMap)) delete assetMap[key];
    for (const img of contentDiv.querySelectorAll('img[data-src], img[src]')) {
        const src = img.getAttribute('data-src') || img.getAttribute('src');
        if (!src || src.match(/^(https?:|data:|blob:)/)) continue;
        if (embeddedMap[src]) {
            img.src = embeddedMap[src];
            img.removeAttribute('data-src');
            continue;
        }
        if (!markdownDirHandle || !currentMarkdownFilePath) continue;
        try {
            const dirParts = currentMarkdownFilePath.split('/').slice(0, -1);
            const srcParts = src.split('/');
            const resolvedParts = [...dirParts];
            for (const part of srcParts) {
                if (part === '.' || part === '') continue;
                if (part === '..') {
                    if (resolvedParts.length > 0) resolvedParts.pop();
                } else {
                    resolvedParts.push(part);
                }
            }
            let dir = markdownDirHandle;
            for (const part of resolvedParts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);
            const file = await (await dir.getFileHandle(resolvedParts.at(-1))).getFile();
            const url = URL.createObjectURL(file);
            assetMap[src] = url;
            img.src = url;
            img.removeAttribute('data-src');
        } catch (e) { 
            console.warn('Could not resolve asset:', src, e); 
            if (img.hasAttribute('data-src')) {
                img.src = src; // Fallback to let the browser try
                img.removeAttribute('data-src');
            }
        }
    }
};

const wrapSections = () => {
    const nodes = Array.from(contentDiv.children);
    contentDiv.innerHTML = '';
    const getLevel = el => { const m = el.tagName && el.tagName.match(/^H([1-6])$/); return m ? parseInt(m[1]) : 7; };
    const build = (nodes) => {
        const frag = document.createDocumentFragment();
        let i = 0;
        while (i < nodes.length) {
            const level = getLevel(nodes[i]);
            if (level < 7) {
                const div = document.createElement('div');
                div.className = `section-h${level}`;
                div.appendChild(nodes[i++]);
                const inner = [];
                while (i < nodes.length && getLevel(nodes[i]) > level) inner.push(nodes[i++]);
                if (inner.length) div.appendChild(build(inner));
                frag.appendChild(div);
            } else {
                frag.appendChild(nodes[i++]);
            }
        }
        return frag;
    };
    contentDiv.appendChild(build(nodes));
    const first = contentDiv.firstElementChild;
    if (first && !first.className.startsWith('section-h')) {
        const preamble = document.createElement('div');
        preamble.className = 'section-h1';
        while (contentDiv.firstChild && !contentDiv.firstChild.className?.startsWith('section-h'))
            preamble.appendChild(contentDiv.firstChild);
        if (contentDiv.firstElementChild?.className === 'section-h1') {
            while (contentDiv.firstElementChild.firstChild)
                preamble.appendChild(contentDiv.firstElementChild.firstChild);
            contentDiv.firstElementChild.remove();
        }
        contentDiv.insertBefore(preamble, contentDiv.firstChild);
    }
};

const applyPageClass  = (level) => contentDiv.querySelectorAll(`.section-${level}`).forEach(el => el.classList.add('page'));
const removePageClass = (level) => contentDiv.querySelectorAll(`.section-${level}`).forEach(el => el.classList.remove('page'));

const splitPagesAtHr = () => {
    contentDiv.querySelectorAll('.page hr').forEach(hr => {
        const page = hr.closest('.page');
        const newPage = document.createElement('div');
        newPage.className = page.className;
        while (hr.nextSibling) newPage.appendChild(hr.nextSibling);
        hr.remove();
        page.after(newPage);
    });
};

const renderMarkdown = async (markdownContent) => {
    currentMarkdownSource = markdownContent;
    contentDiv.innerHTML = await marked.parse(markdownContent);
    await resolveRelativeAssets();
    wrapSections();
    applyPageClass('h1');
    applyPageClass('h2');
    if (h3PageBreakCheckbox.checked) applyPageClass('h3');
    splitPagesAtHr();
    await renderMermaid();
    await renderDotDiagrams();
};


// =============================================================
// File management
// =============================================================

const buildTree = async (dirHandle, currentPath = '') => {
    const entries = [];
    for await (const [name, handle] of dirHandle.entries())
        entries.push({ name, handle, kind: handle.kind });
    entries.sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1);
    const nodes = [];
    for (const e of entries) {
        if (e.kind === 'directory') {
            const children = await buildTree(e.handle, currentPath + e.name + '/');
            if (children.length) nodes.push({ name: e.name, kind: 'dir', children });
        } else if (e.name.toLowerCase().endsWith('.md')) {
            nodes.push({ name: e.name, kind: 'file', handle: e.handle, path: currentPath + e.name });
        }
    }
    return nodes;
};

let mdFileHandles = {};

const populateFileTree = (nodes, currentName, rootName) => {
    mdFileHandles = {};
    const container = document.getElementById('fileTree');
    container.innerHTML = '';
    const rootSummary = document.createElement('summary');
    rootSummary.textContent = rootName;
    container.appendChild(rootSummary);
    let activeSet = false;
    const buildTree = (nodes, parent, path) => nodes.forEach(node => {
        if (node.kind === 'file') {
            const filePath = path + node.name;
            mdFileHandles[filePath] = node.handle;
            const item = document.createElement('div');
            item.className = 'tree-file';
            item.textContent = node.name;
            if (node.name === currentName && !activeSet) {
                item.classList.add('active');
                activeSet = true;
            }
            item.addEventListener('click', async () => {
                container.querySelectorAll('.tree-file.active').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                markdownFileHandle = mdFileHandles[filePath];
                currentMarkdownFilePath = node.path;
                setSetting('selectedFile', node.path);
                await restoreSettings();
                await refreshMarkdown();
            });
            parent.appendChild(item);
        } else {
            const details = document.createElement('details');
            details.open = true;
            const summary = document.createElement('summary');
            summary.textContent = node.name;
            details.appendChild(summary);
            buildTree(node.children, details, path + node.name + '/');
            parent.appendChild(details);
        }
    });
    buildTree(nodes, container, '');
};

const loadMarkdownWithHandle = async () => {
    try {
        const storedHandle = await getSetting('dirHandle');
        let dirHandle;
        if (storedHandle && !markdownDirHandle) {
            const perm = await storedHandle.requestPermission({ mode: 'read' });
            if (perm === 'granted') dirHandle = storedHandle;
        }
        if (!dirHandle) {
            dirHandle = await window.showDirectoryPicker({ mode: 'read', startIn: markdownDirHandle || 'documents' });
        }
        markdownDirHandle = dirHandle;
        const tree = await buildTree(dirHandle);
        const mdFiles = [];
        const collect = nodes => nodes.forEach(n => n.kind === 'file' ? mdFiles.push(n) : collect(n.children));
        collect(tree);
        if (!mdFiles.length) { alert('No .md files found in this folder.'); return; }
        const selectedFile = await getSetting('selectedFile');
        const target = mdFiles.find(f => f.path === selectedFile) || mdFiles.find(f => f.name === selectedFile) || mdFiles[0];
        markdownFileHandle = target.handle;
        currentMarkdownFilePath = target.path;
        document.getElementById('openFileBtnControl').title = dirHandle.name;
        populateFileTree(tree, target.name, dirHandle.name);
        await refreshMarkdown();
        setSetting('dirHandle', dirHandle);
        setSetting('selectedFile', target.path);
    } catch (err) {
        if (err.name !== 'AbortError') console.error('Folder open failed:', err);
    }
};

const refreshMarkdown = async () => {
    if (!markdownFileHandle) { alert('No markdown file selected. Please select a file first.'); return; }
    try {
        const file = await markdownFileHandle.getFile();
        await renderMarkdown(await file.text());
    } catch (err) {
        console.error('Failed to read file:', err);
        alert('Failed to read file. You may need to re-select it.');
    }
};

const restoreFolder = async () => {
    const dirHandle = await getSetting('dirHandle');
    if (!dirHandle) return false;
    try {
        const perm = await dirHandle.requestPermission({ mode: 'read' });
        if (perm === 'granted') {
            markdownDirHandle = dirHandle;
            const tree = await buildTree(dirHandle);
            const mdFiles = [];
            const collect = nodes => nodes.forEach(n => n.kind === 'file' ? mdFiles.push(n) : collect(n.children));
            collect(tree);
            if (!mdFiles.length) return false;
            const selectedFile = await getSetting('selectedFile');
            const target = mdFiles.find(f => f.path === selectedFile) || mdFiles.find(f => f.name === selectedFile) || mdFiles[0];
            markdownFileHandle = target.handle;
            currentMarkdownFilePath = target.path;
            document.getElementById('openFileBtnControl').title = dirHandle.name;
            populateFileTree(tree, target.name, dirHandle.name);
            await restoreSettings();
            await refreshMarkdown();
            return true;
        }
        document.getElementById('openFileBtnControl').title = dirHandle.name;
        return false;
    } catch (e) { console.warn('Could not restore folder:', e); return false; }
};

const loadFromUrl = async () => {
    const mdUrl = new URLSearchParams(window.location.search).get('md');
    if (!mdUrl) return;
    detailsElement.removeAttribute('open');
    contentDiv.innerHTML = `<h1>Loading from ${mdUrl}...</h1>`;
    try {
        const response = await fetch(mdUrl);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        contentDiv.innerHTML = await marked.parse(await response.text());
        await renderMermaid();
    } catch (err) {
        contentDiv.innerHTML = `<h1>Failed to load content from URL</h1><p><b>URL:</b> ${mdUrl}</p><p><b>Error:</b> ${err.message}</p>`;
    }
};

let userGuideMarkdown = '';

const loadUserGuide = async () => {
    if (!userGuideMarkdown) {
        // 1. Try to find baked-in help doc (Standalone channel)
        const el = document.getElementById('help-doc');
        if (el && el.textContent.trim()) {
            userGuideMarkdown = el.textContent;
        } else {
            // 2. Fetch from external file (Dev/Webapp channel)
            try {
                const resp = await fetch('./user-guide.md');
                userGuideMarkdown = await resp.text();
            } catch (e) {
                console.warn('Could not load user-guide.md', e);
                userGuideMarkdown = '# Error\nCould not load user guide.';
            }
        }
    }
    markdownFileHandle = null;
    await renderMarkdown(userGuideMarkdown);
    const openFileBtn = contentDiv.querySelector('.open-file-btn');
    if (openFileBtn) openFileBtn.addEventListener('click', loadMarkdownWithHandle);
};

const readFile = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload  = (e) => callback(e.target.result);
    reader.onerror = (e) => console.error('File could not be read!', e);
    reader.readAsText(file);
};


// =============================================================
// Controls (event listeners)
// =============================================================

bgColorInput.addEventListener('input',       () => { root.style.setProperty('--bg-color',       bgColorInput.value); saveSettings(); });
textColorInput.addEventListener('input',     () => { root.style.setProperty('--text-color',      textColorInput.value); saveSettings(); });
headerColorInput.addEventListener('input',   () => { root.style.setProperty('--header-color',    headerColorInput.value); saveSettings(); });
codeBgColorInput.addEventListener('input',   () => { root.style.setProperty('--code-bg-color',   codeBgColorInput.value); saveSettings(); });
codeTextColorInput.addEventListener('input', () => { root.style.setProperty('--code-text-color', codeTextColorInput.value); saveSettings(); });

fontSizeSlider.addEventListener('input', (e) => {
    document.body.style.fontSize = `${e.target.value}px`;
    saveSettings();
});

maxWidthSlider.addEventListener('input', (e) => {
    document.body.style.maxWidth = `${e.target.value}em`;
    saveSettings();
});

h3PageBreakCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) applyPageClass('h3');
    else removePageClass('h3');
    saveSettings();
});

let easyMDE = null;

const toggleEditMode = () => {
    const isEditing = document.body.classList.toggle('editing');
    
    if (isEditing) {
        if (!easyMDE) {
            easyMDE = new EasyMDE({
                element: document.getElementById('editor-textarea'),
                spellChecker: false,
                autofocus: true,
                status: false,
                toolbar: [
                    "bold", "italic", "heading", "|", 
                    "quote", "unordered-list", "ordered-list", "|", 
                    "link", "image", "table", "|", 
                    "guide"
                ],
                renderingConfig: {
                    markedOptions: { sanitize: false }
                }
            });
            
            easyMDE.codemirror.on("change", () => {
                const val = easyMDE.value();
                currentMarkdownSource = val;
                
                // Debounce render to maintain performance
                clearTimeout(window.renderTimeout);
                window.renderTimeout = setTimeout(() => {
                    renderMarkdown(val);
                }, 300);
            });
            
            // Add custom Cmd+S / Ctrl+S to save the file
            easyMDE.codemirror.setOption("extraKeys", {
                "Cmd-S": function(cm) { saveMarkdownFile(); },
                "Ctrl-S": function(cm) { saveMarkdownFile(); }
            });
        }
        
        easyMDE.value(currentMarkdownSource);
        setTimeout(() => easyMDE.codemirror.refresh(), 10);
    } else {
        if (easyMDE) {
            currentMarkdownSource = easyMDE.value();
            renderMarkdown(currentMarkdownSource);
        }
    }
};

const saveMarkdownFile = async () => {
    if (!markdownFileHandle) {
        alert("No file selected to save to.");
        return;
    }
    try {
        const writable = await markdownFileHandle.createWritable();
        await writable.write(easyMDE ? easyMDE.value() : currentMarkdownSource);
        await writable.close();
        
        // Brief visual feedback
        const btn = document.getElementById('editBtn');
        const oldText = btn.innerHTML;
        btn.innerHTML = "✅ Saved!";
        setTimeout(() => btn.innerHTML = oldText, 1500);
    } catch (err) {
        console.error("Save failed:", err);
        alert("Save failed. Ensure you have granted write permissions.");
    }
};

document.getElementById('openFileBtnControl').addEventListener('click', loadMarkdownWithHandle);
document.getElementById('editBtn').addEventListener('click', toggleEditMode);
refreshBtn.addEventListener('click', async () => { await refreshMarkdown(); detailsElement.removeAttribute('open'); });
document.getElementById('helpBtn').addEventListener('click', loadUserGuide);

document.getElementById('printBtn').addEventListener('click', () => {
    detailsElement.removeAttribute('open');
    window.print();
});

cssInput.addEventListener('change', (e) => {
    readFile(e.target.files[0], (css) => { customCssStyleTag.innerHTML = css; });
});

jsInput.addEventListener('change', (e) => {
    readFile(e.target.files[0], (js) => {
        const script = document.createElement('script');
        script.textContent = js;
        document.body.appendChild(script);
    });
});

document.getElementById('factoryResetBtn').addEventListener('click', async () => {
    applySettings(DEFAULTS);
    const docKey = getDocKey();
    if (docKey) {
        const userDelta = await getSetting('user') || {};
        const effective = { ...DEFAULTS, ...userDelta };
        const delta = computeDelta(effective, DEFAULTS);
        setSetting(docKey, delta);
    }
});

document.getElementById('userSettingBtn').addEventListener('click', async () => {
    const docKey = getDocKey();
    if (docKey) setSetting(docKey, null);
    const userDelta = await getSetting('user') || {};
    applySettings({ ...DEFAULTS, ...userDelta });
});

document.getElementById('saveUserBtn').addEventListener('click', async () => {
    await saveAsUserDefault();
});


// =============================================================
// Share / Export
// =============================================================

const getAppCSS = async () => {
    const el = document.getElementById('app-css');
    if (el.textContent) return el.textContent;
    if (DIST_CHANNEL === 'webapp' && el.href) return await (await fetch(el.href)).text();
    return '';
};
const getAppJS = async () => {
    const el = document.getElementById('app-js');
    if (el.textContent) return el.textContent;
    if (DIST_CHANNEL === 'webapp' && el.src) return await (await fetch(el.src)).text();
    return '';
};
const getHelpDoc = async () => {
    if (!userGuideMarkdown) {
        try {
            const resp = await fetch('./user-guide.md');
            userGuideMarkdown = await resp.text();
        } catch (e) {
            console.warn('Could not load user-guide.md for share', e);
        }
    }
    return userGuideMarkdown;
};

const buildAssetData = async () => {
    const embedded = document.getElementById('assets');
    const data = embedded ? JSON.parse(embedded.textContent || '{}') : {};
    for (const [src, blobUrl] of Object.entries(assetMap)) {
        try {
            const resp = await fetch(blobUrl);
            const blob = await resp.blob();
            const base64 = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
            data[src] = base64;
        } catch (e) { console.warn('Could not inline asset:', src, e); }
    }
    return data;
};

const getVendorScripts = () => {
    const ids = ['vendor-marked', 'vendor-marked-gfm', 'vendor-mermaid', 'vendor-viz'];
    return ids.map(id => {
        const el = document.getElementById(id);
        if (!el) return '';
        if (el.textContent.trim()) return `    <script id="${id}">${el.textContent}<\/script>`;
        return `    <script id="${id}" src="${el.src}"><\/script>`;
    }).join('\n');
};

const generateHTML = async (markdownContent, assets, includeVendors = true) => {
    const css = await getAppCSS();
    const js = await getAppJS();
    const help = await getHelpDoc();
    const controls = document.getElementById('details').outerHTML;
    const assetsJSON = assets ? JSON.stringify(assets) : '{}';
    const restoreAttr = markdownContent ? '' : ' data-restore="false"';
    const vendors = includeVendors ? getVendorScripts() : `    <script id="vendor-marked" src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
    <script id="vendor-marked-gfm" src="https://cdn.jsdelivr.net/npm/marked-gfm-heading-id/lib/index.umd.js"><\/script>
    <script id="vendor-mermaid" src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"><\/script>
    <script id="vendor-viz" src="https://cdn.jsdelivr.net/npm/@viz-js/viz@3/lib/viz-standalone.js"><\/script>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Presenter</title>
    <!-- === APP STYLES === -->
    <style id="app-css">${css}</style>
    <style id="custom-css"></style>
</head>
<body${restoreAttr}>
    <!-- === APP CONTROLS === -->
    ${controls}
    <div id="content"></div>
    <!-- === VENDOR LIBS === -->
${vendors}
    <!-- === ASSETS === -->
    <script type="application/json" id="assets">${assetsJSON}<\/script>
    <!-- === DEFAULT DOCUMENT === -->
    <script type="text/markdown" id="default-doc">${markdownContent}<\/script>
    <!-- === HELP DOCUMENT === -->
    <script id="help-doc">${help}<\/script>
    <!-- === APP LOGIC === -->
    <script id="app-js">${js}</script>
</body>
</html>`;
};

const downloadFile = (content, filename, type = 'text/html') => {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
};

document.getElementById('shareBtn').addEventListener('click', async () => {
    if (!currentMarkdownSource) { alert('No document loaded to share.'); return; }
    const assets = await buildAssetData();
    const html = await generateHTML(currentMarkdownSource, assets, true);
    const name = markdownFileHandle ? markdownFileHandle.name.replace(/\.md$/, '.html') : 'shared-presentation.html';
    downloadFile(html, name);
});

document.getElementById('exportBtn').addEventListener('click', async () => {
    const html = await generateHTML('', null, false);
    downloadFile(html, 'markdown-presenter.html');
});

document.getElementById('mdBtn').addEventListener('click', () => {
    if (!currentMarkdownSource) { alert('No document loaded.'); return; }
    const name = markdownFileHandle ? markdownFileHandle.name : 'document.md';
    downloadFile(currentMarkdownSource, name, 'text/markdown');
});

const buildDocHTML = async () => {
    const css = await getAppCSS();
    const vars = `:root{--bg-color:${bgColorInput.value};--text-color:${textColorInput.value};--header-color:${headerColorInput.value};--code-bg-color:${codeBgColorInput.value};--code-text-color:${codeTextColorInput.value}}`;
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${vars}\n${css}</style></head>
<body>${contentDiv.innerHTML}</body></html>`;
};

document.getElementById('htmlBtn').addEventListener('click', async () => {
    if (!currentMarkdownSource) { alert('No document loaded.'); return; }
    const name = markdownFileHandle ? markdownFileHandle.name.replace(/\.md$/, '.html') : 'document.html';
    downloadFile(await buildDocHTML(), name);
});


// =============================================================
// Present mode
// =============================================================

let presentIndex = 0;
let presentPages = [];
let presentPageParents = [];

const showPresentSlide = () => {
    presentPages.forEach(p => p.classList.remove('slide-active'));
    presentPages[presentIndex].classList.add('slide-active');
};

const enterPresent = () => {
    presentPages = Array.from(contentDiv.querySelectorAll('.page'));
    if (!presentPages.length) { alert('No slides found. Open a markdown file first.'); return; }
    presentPageParents = presentPages.map(p => ({ parent: p.parentNode, next: p.nextSibling }));
    presentPages.forEach(p => document.body.appendChild(p));
    presentIndex = 0;
    document.body.classList.add('presenting');
    showPresentSlide();
    detailsElement.removeAttribute('open');
    document.documentElement.requestFullscreen().catch(() => {});
};

const exitPresent = () => {
    document.body.classList.remove('presenting');
    presentPages.forEach(p => p.classList.remove('slide-active'));
    for (let i = presentPages.length - 1; i >= 0; i--)
        presentPageParents[i].parent.insertBefore(presentPages[i], presentPageParents[i].next);
    presentPageParents = [];
    if (document.fullscreenElement) document.exitFullscreen();
};

document.getElementById('presentBtn').addEventListener('click', enterPresent);

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && document.body.classList.contains('presenting')) exitPresent();
});

document.addEventListener('keydown', (e) => {
    const inText = e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
    if (document.body.classList.contains('presenting')) {
        if      (e.key === 'ArrowRight' || e.key === 'ArrowDown') { if (presentIndex < presentPages.length - 1) { presentIndex++; showPresentSlide(); } }
        else if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { if (presentIndex > 0) { presentIndex--; showPresentSlide(); } }
        return;
    }
    if (inText) return;
    if (e.metaKey || e.ctrlKey || e.altKey) {
        // Intercept global Cmd+S if not in editor
        if ((e.key === 's' || e.key === 'S') && !document.body.classList.contains('presenting')) {
            e.preventDefault();
            saveMarkdownFile();
        }
        return;
    }
    if      (e.key === 'p') enterPresent();
    else if (e.key === 'r') refreshMarkdown();
    else if (e.key === 'o') loadMarkdownWithHandle();
    else if (e.key === 'e') toggleEditMode();
    else if (e.key === 'Escape') detailsElement.open = !detailsElement.open;
});

// Initial load
restoreFolder().then(restored => {
    if (!restored) loadFromUrl().then(() => {
        if (!contentDiv.innerHTML.trim()) loadUserGuide();
    });
});
