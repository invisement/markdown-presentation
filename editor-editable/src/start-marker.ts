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
        this.#parent.enforceStructure();
    }

    disconnectedCallback() {
        this.#parent.enforceStructure();
    }

    private validate(newText: string) {
        const parts = SemanticRules.splitMarker(newText);

        // 1. Push spillovers (parts.leftChar and parts.rightChar are strictly spillovers now!)
        this.pushSpillovers(parts.leftChar, parts.rightChar);

        // 2. Reset the marker's own text content only if it actually changed (prevents caret jumps)
        if (this.textContent !== parts.middleChar) {
            this.#observer?.disconnect();
            this.textContent = parts.middleChar;
            this.#observer?.observe(this, { characterData: true, subtree: true });
        }

        // 3. Derive parent class from the exact middle marker text
        const newClass = SemanticRules.getClass(parts.middleChar);

        // 4. Update validation classes and parent className SOT
        this.classList.toggle('valid', !!newClass);
        this.#parent.classList.toggle('invalid', !newClass);

        if (newClass) {
            this.#parent.className = newClass;
        }

        // 5. Update EndMarker content (To be fully purged in Iteration 17)
        const expectedEnd = SemanticRules.getClosingMarker(parts.middleChar);
        const endMarker = this.#parent.querySelector(':scope > .marker.end');
        if (endMarker) {
            endMarker.textContent = expectedEnd;
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

if (!customElements.get('start-marker')) {
    customElements.define('start-marker', StartMarker);
}
