console.log('Husk Editor: mod.ts loading...');

// Load EasyMDE from the global scope (injected via CDN script tag)
// This avoids massive bundle sizes and missing CodeMirror mode issues.
const EasyMDE = (window as any).EasyMDE;



export interface EditorOptions {
    onChange: (value: string) => void;
    onSave: () => void;
}

export class MarkdownEditor {
    private easyMDE: EasyMDE | null = null;

    init(element: HTMLElement, options: EditorOptions) {
        if (this.easyMDE) return;

        this.easyMDE = new EasyMDE({
            element: element as HTMLTextAreaElement,
            spellChecker: false,
            autofocus: true,
            indentWithTabs: false,
            tabSize: 2,
            // Force CodeMirror options
            forceSync: true,
            toolbar: [
                "bold", "italic", "heading", "|", 
                "quote", "unordered-list", "ordered-list", "|", 
                "link", "image", "table", "|", 
                "guide"
            ]
        });

        // Tweak CodeMirror directly for behavior
        this.easyMDE.codemirror.setOption("smartIndent", false);
        this.easyMDE.codemirror.setOption("mode", "gfm");

        this.easyMDE.codemirror.on("change", () => {
            options.onChange(this.easyMDE!.value());
        });

        // Add custom Cmd+S / Ctrl+S to save the file
        this.easyMDE.codemirror.setOption("extraKeys", {
            "Cmd-S": () => options.onSave(),
            "Ctrl-S": () => options.onSave()
        });
    }

    getValue(): string {
        return this.easyMDE ? this.easyMDE.value() : "";
    }

    setValue(value: string) {
        if (this.easyMDE) {
            this.easyMDE.value(value);
        }
    }

    refresh() {
        if (this.easyMDE) {
            this.easyMDE.codemirror.refresh();
        }
    }
}

export default MarkdownEditor;
