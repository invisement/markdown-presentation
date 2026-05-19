import type { SemanticTag } from "./semantic-tag.ts";

export class SemanticMarker extends HTMLElement {
    #isStart = true;
    #parent!: SemanticTag;
    #observer = new MutationObserver(() => {
        this.#parent.onMarkerChange(this.textContent, this.#isStart);
    });

    constructor(marker: string = "", isStart = true) {
        super();
        this.textContent = marker;
        this.#isStart = isStart;
    }

    connectedCallback() {
        if (!this.textContent) { // means it is initiated by html tag, no args, now properties avaiulable and we can use them
            this.textContent = this.getAttribute('marker');
            this.#isStart = !this.hasAttribute('is-end'); // if is-end is missing, go default is-start
        }

        this.#parent = this.parentElement as SemanticTag
        this.#observer.observe(this, { characterData: true, subtree: true });
    }

    disconnectedCallback() {
        this.#parent.onMarkerRemove();
    }
}

if (!customElements.get('semantic-marker')) {
    customElements.define('semantic-marker', SemanticMarker);
}
