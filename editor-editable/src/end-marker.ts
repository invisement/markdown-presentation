import type { SemanticTag } from "./semantic-tag.ts";

export class EndMarker extends HTMLElement {
    #parent!: SemanticTag;

    constructor() {
        super();
    }

    initFromParser(markerText: string, parentId: string) {
        this.className = 'marker end';
        this.setAttribute('contenteditable', 'false');
        this.textContent = markerText;
        this.setAttribute('parent-id', parentId);
    }

    initFromResurrection(markerText: string, parentId: string) {
        this.className = 'marker end';
        this.setAttribute('contenteditable', 'false');
        this.textContent = markerText;
        this.setAttribute('parent-id', parentId);
    }

    connectedCallback() {
        this.#parent = this.parentElement as SemanticTag;
        //    this.#parent.enforceStructure();
    }

    disconnectedCallback() {
        // NOTE: The user cannot manually alter or delete the end-marker, 
        // but the browser natively removes it during "breaking/splitting" line transformations.
        //    this.#parent.enforceStructure();
    }
}

if (!customElements.get('end-marker')) {
    customElements.define('end-marker', EndMarker);
}
