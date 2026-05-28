import { SemanticRules } from './semantic-rules.ts';
import { StartMarker } from './start-marker.ts';
import './end-marker.ts';

export class SemanticTag extends HTMLElement {
    static nextId = 1;

    startMarker!: StartMarker;
    endMarker!: HTMLElement;

    constructor() {
        super(); // Pure, zero-attribute constructor (fully HTML spec-compliant!)
    }

    set dataFromParser(val: { marker: string; content: DocumentFragment }) {
        // Defer unique ID generation safely to the setter
        if (!this.id) {
            this.id = `semantic-tag-${SemanticTag.nextId++}`;
        }

        const { marker, content } = val;
        this.className = SemanticRules.getClass(marker);

        // 1. Create Start Marker
        const startMarker = new StartMarker(marker);
        startMarker.setAttribute('parent-id', this.id);

        // 2. Create End Marker
        const endPair = SemanticRules.getClosingMarker(marker);
        const endMarker = document.createElement('end-marker');
        endMarker.className = 'marker end';
        endMarker.setAttribute('contenteditable', 'false');
        endMarker.textContent = endPair;
        endMarker.setAttribute('parent-id', this.id);

        // 3. Append them sequentially
        this.append(startMarker);
        const nodes = Array.isArray(content) ? content : [content];
        for (const node of nodes) {
            this.append(typeof node === 'string' ? document.createTextNode(node) : node);
        }
        this.append(endMarker);

        // 4. Cache wing references
        this.startMarker = startMarker;
        this.endMarker = endMarker;
    }

    set startMarkerContent(content: string) {
        if (!this.id) {
            this.id = `semantic-tag-${SemanticTag.nextId++}`;
        }

        const marker = new StartMarker(content);
        marker.setAttribute('parent-id', this.id);
        this.prepend(marker);
        this.startMarker = marker;

        this.className = marker.reclass(content);
    }
}

if (!customElements.get('semantic-tag')) {
    customElements.define('semantic-tag', SemanticTag);
}
