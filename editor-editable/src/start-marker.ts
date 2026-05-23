import type { SemanticTag } from "./semantic-tag.ts";
import { SemanticRules } from "./semantic-rules.ts";

export class StartMarker extends HTMLElement {
    #parent!: SemanticTag;
    #observer: MutationObserver | null = null;

    constructor(marker: string = "") {
        super();
        this.textContent = marker;
    }

    connectedCallback() {
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
        const parts = SemanticRules.splitMarker(newText);

        // 1. Push spillovers to neighboring text nodes
        this.pushSpillovers(parts.leftChar, parts.rightChar);

        // 2. Reset the marker's own text if spillovers occurred
        if (parts.leftChar || parts.rightChar) {
            this.#observer?.disconnect();
            this.textContent = parts.middleChar;
            this.#observer?.observe(this, { characterData: true, subtree: true });
        }

        // 3. Derive parent class from the exact middle marker text (which splits pre-wrapped)
        const newClass = SemanticRules.getClass(parts.middleChar);

        if (newClass && newClass !== 'p') {
            this.classList.remove('semantic-alarm');
            this.classList.add('valid');
            this.#parent.classList.remove('invalid'); // Clear invalid SOT tag status
            this.#parent.className = newClass;

            const expectedEnd = SemanticRules.getClosingMarker(parts.middleChar);
            const endMarker = this.#parent.querySelector('.marker.end');
            if (endMarker) {
                endMarker.textContent = expectedEnd;
            }
        } else {
            this.classList.remove('valid');
            this.classList.add('semantic-alarm');
            this.#parent.classList.add('invalid'); // Flag SOT parent as invalid
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

if (!customElements.get('semantic-marker')) {
    customElements.define('semantic-marker', StartMarker);
}
