import type { SemanticTag } from "./semantic-tag.ts";

export class EndMarker extends HTMLElement {
    #parent!: SemanticTag;

    connectedCallback() {
        this.#parent = this.parentElement as SemanticTag;
    }

    disconnectedCallback() {
        if (!this.#parent || !this.#parent.isConnected) {
            return; // Parent tag is dead/unwrapping, ignore!
        }
        this.#parent.resurrectionEndMarker();
    }
}

if (!customElements.get('semantic-end-marker')) {
    customElements.define('semantic-end-marker', EndMarker);
}
