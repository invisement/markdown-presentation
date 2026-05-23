import type { SemanticTag } from "./semantic-tag.ts";
import { classToMarker, SemanticRules } from "./semantic-tag.ts";

export class SemanticMarker extends HTMLElement {
    #parent!: SemanticTag;
    #observer: MutationObserver | null = null;

    constructor(marker: string = "") {
        super();
        this.textContent = '\u200B' + marker;
    }

    connectedCallback() {
        const rawMarker = this.getAttribute('marker') || this.textContent || "";
        if (!rawMarker.startsWith('\u200B')) {
            this.textContent = '\u200B' + rawMarker;
        }

        this.#parent = this.parentElement as SemanticTag;

        this.#observer = new MutationObserver(() => {
            this.validate(this.textContent!);
        });
        this.#observer.observe(this, { characterData: true, subtree: true });

        this.validate(this.textContent!);
    }

    disconnectedCallback() {
        if (!this.#parent || !this.#parent.isConnected) {
            return; // Parent tag is dead/unwrapping, ignore!
        }
        this.#parent.deletionEndMarker();
    }

    private validate(newText: string) {
        const textWithoutZws = newText.replace(/\u200B/g, '');
        const parts = split(textWithoutZws);

        // 1. Push spillovers to neighboring text nodes
        this.pushSpillovers(parts.leftChar, parts.rightChar);

        // 2. Reset the marker's own text if spillovers occurred
        if (parts.leftChar || parts.rightChar) {
            this.#observer?.disconnect();
            this.textContent = '\u200B' + parts.middleChar;
            this.#observer?.observe(this, { characterData: true, subtree: true });
        }

        // 3. Derive parent class from the exact middle marker text
        const newClass = SemanticRules.markerToClass(parts.middleChar);

        if (newClass && newClass !== 'p') {
            this.classList.remove('semantic-alarm');
            this.classList.add('valid');
            this.#parent.className = newClass;

            // Symmetrically cascade expected pair to the end marker
            const expectedEnd = SemanticRules.getPair(parts.middleChar, true);
            const endMarker = this.#parent.querySelector('.marker.end');
            if (endMarker) {
                endMarker.textContent = expectedEnd;
            }
        } else {
            this.classList.remove('valid');
            this.classList.add('semantic-alarm');
        }
    }

    private pushSpillovers(leftChar: string, rightChar: string) {
        if (leftChar) {
            const prev = this.previousSibling;
            if (prev && prev.nodeType === Node.TEXT_NODE) {
                (prev as Text).appendData(leftChar);
            } else {
                const textNode = document.createTextNode(leftChar);
                this.parentNode?.insertBefore(textNode, this);
            }
        }

        if (rightChar) {
            const next = this.nextSibling;
            if (next && next.nodeType === Node.TEXT_NODE) {
                (next as Text).insertData(0, rightChar);
            } else {
                const textNode = document.createTextNode(rightChar);
                this.parentNode?.insertBefore(textNode, this.nextSibling);
            }
        }
    }
}

export class SemanticEndMarker extends HTMLElement {
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

export interface MarkerParts {
    leftChar: string;
    middleChar: string;
    rightChar: string;
}

export function split(markersWithBorders: string): MarkerParts {
    const pattern = /^([^*`~#\-><]*)([*`~#\-><]+)([\s\S]*)$/;
    const match = markersWithBorders.match(pattern);

    if (!match) {
        return { leftChar: "", middleChar: "", rightChar: markersWithBorders };
    }

    return {
        leftChar: match[1],
        middleChar: match[2],
        rightChar: match[3]
    };
}

if (!customElements.get('semantic-marker')) {
    customElements.define('semantic-marker', SemanticMarker);
}

if (!customElements.get('semantic-end-marker')) {
    customElements.define('semantic-end-marker', SemanticEndMarker);
}
