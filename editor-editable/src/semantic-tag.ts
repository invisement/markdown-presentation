/**
 * semantic-tag.ts — The Autonomous Controller for Markdown structures.
 * It manages its own internal Light DOM and attaches MutationObservers 
 * specifically to its syntax markers.
 */

/**
 * Determine the CSS class based on marker content.
 */
function getStyleClass(marker: string): string {
    const m = marker.trim();
    if (m === '**') return 'b';
    if (m === '*') return 'i';
    if (m === '`') return 'code';
    if (m.startsWith('#')) return 'h' + m.length;
    if (m === '-') return 'li';
    if (m === '```') return 'pre';
    if (m.startsWith('<')) return 'html-tag';
    return 'p';
}

/**
 * Determine the content for the pairing marker.
 */
function getPairingContent(marker: string, isStart: boolean): string {
    const m = marker.trim();
    
    // Symmetric Markdown Pairs
    if (m === '**' || m === '*' || m === '`' || m === '```') return m;
    
    // HTML Tag Pair Matching
    if (m.startsWith('<')) {
        const match = m.match(/<(\/?[a-z1-6]+)/i);
        if (match) {
            const tag = match[1].replace('/', '');
            return isStart ? `</${tag}>` : `<${tag}>`;
        }
    }
    
    // Pattern 2 (Leading only)
    return '';
}

/**
 * SemanticTag — The unified, autonomous web component.
 */
export class SemanticTag extends HTMLElement {
    #observer?: MutationObserver;
    #isSyncing = false;
    
    // Cached DOM Nodes
    #startMarker!: HTMLElement;
    #contentSpan!: HTMLElement;
    #endMarker?: HTMLElement;

    constructor(marker?: string, content?: string) {
        super();
        // If instantiated with data via AST parser, build the internal DOM immediately.
        if (marker !== undefined) {
            this.buildTemplate(marker, content || '');
        }
    }

    private buildTemplate(marker: string, content: string) {
        this.className = getStyleClass(marker);
        const endText = getPairingContent(marker, true);

        // Build the structural HTML template
        this.innerHTML = `
            <span class="marker start"></span>
            <span class="content"></span>
            ${endText ? '<span class="marker end"></span>' : ''}
        `;

        // Safely inject text content and cache the DOM references
        this.#startMarker = this.querySelector('.marker.start') as HTMLElement;
        this.#startMarker.textContent = marker;
        
        this.#contentSpan = this.querySelector('.content') as HTMLElement;
        this.#contentSpan.textContent = content;
        
        if (endText) {
            this.#endMarker = this.querySelector('.marker.end') as HTMLElement;
            this.#endMarker.textContent = endText;
        }
    }


    connectedCallback() {
        // Prevent duplicate observers if the node is moved using legacy DOM methods
        if (this.#observer) return;

        // If instantiated via HTML parsing instead of constructor, cache the nodes now
        if (!this.#startMarker) {
            this.#startMarker = this.querySelector('.marker.start') as HTMLElement;
            this.#contentSpan = this.querySelector('.content') as HTMLElement;
            const end = this.querySelector('.marker.end');
            if (end) this.#endMarker = end as HTMLElement;
        }

        if (!this.#startMarker) return;

        // Only attach observer to the specific marker nodes
        this.#observer = new MutationObserver(() => this.handleMutation());
        this.#observer.observe(this.#startMarker, { characterData: true, subtree: true, childList: true });
        if (this.#endMarker) {
            this.#observer.observe(this.#endMarker, { characterData: true, subtree: true, childList: true });
        }
    }

    private handleMutation() {
        if (this.#isSyncing) return;

        // We trust the happy path. If startMarker is missing, the component's invariant is broken
        // and we want it to throw a loud TypeError (Fail-Fast) rather than silently ignoring it.
        const markerText = this.#startMarker.textContent || '';
        
        // 1. Update State
        this.className = getStyleClass(markerText);

        // 2. Pair Syncing
        if (this.#endMarker) {
            const expectedEnd = getPairingContent(markerText, true);
            if (this.#endMarker.textContent !== expectedEnd) {
                this.#isSyncing = true;
                this.#endMarker.textContent = expectedEnd;
                // Allow observer to catch its breath before accepting new mutations
                queueMicrotask(() => { this.#isSyncing = false; });
            }
        }
    }
}

if (!customElements.get('semantic-tag')) {
    customElements.define('semantic-tag', SemanticTag);
}
