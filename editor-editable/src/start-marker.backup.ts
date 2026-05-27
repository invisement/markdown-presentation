import type { SemanticTag } from "./semantic-tag.ts";
import { SemanticRules } from "./semantic-rules.ts";

export class StartMarker extends HTMLElement {
    #parent!: SemanticTag;
    #observer: MutationObserver | null = null;

    // Stored boundary states
    #left: string | null = "";
    #middle: string = "";
    #right: string | null = "";

    constructor(marker: string = "") {
        super();
        this.textContent = marker;
    }

    connectedCallback() {
        this.#parent = this.parentElement as SemanticTag;

        const initialText = this.textContent;
        const className = this.#parent.className;
        const expectedSyntax = SemanticRules.getMarkerFromClass(className);

        if (expectedSyntax && initialText.includes(expectedSyntax)) {
            const index = initialText.indexOf(expectedSyntax);
            this.#left = initialText.substring(0, index);
            this.#middle = expectedSyntax;
            this.#right = initialText.substring(index + expectedSyntax.length);
        } else {
            this.#left = "";
            this.#middle = initialText;
            this.#right = "";
        }

        this.#observer = new MutationObserver(() => {
            this.contentChange();
        });
        this.#observer.observe(this, { characterData: true, subtree: true });

        this.contentChange();
        this.#parent.enforceStructure();
    }

    disconnectedCallback() {
        this.#parent.enforceStructure();
    }

    private contentChange() {
        const content = this.textContent;
        let className = ""

        const { leftChars, middleChars, rightChars } = SemanticRules.split(content, this.#parent.className);

        // check new class
        if (middleChars !== this.#middle) {
            className = SemanticRules.getClass(middleChars);
        }
        this.#left = this.defineLeft(leftChars, className);
        this.#right = this.defineRight(rightChars, className);

        this.#parent.className = SemanticRules.validate(className, this.#left, this.#right)
    }

    private defineLeft(leftChars: string, className: string): string {
        let { status, spillOver, leftBorder } = SemanticRules.checkLeftStatus(leftChars, className, (cls) => this.pullFromLeft(cls));

        // for both valid and invalid probably:
        this.#left = leftBorder;
        if (spillOver) this.pushToLeft(spillOver, className);
        return leftBorder;
    }

    private defineRight(right: string, className: string): string {
        let { status, rightBorder, spillOver } = SemanticRules.checkRightStatus(right, className, (cls) => this.pullFromRight(cls));

        this.#right = rightBorder;
        if (spillOver) this.pushToRight(spillOver, className);
        return rightBorder;
    }


    private pullFromLeft(className: string): string {
        const sibling = SemanticRules.isBlock(className)
            ? this.previousSibling
            : this.#parent.previousSibling;
        return sibling?.textContent?.slice(-20) || "";
    }

    private pushToLeft(spillOver: string, className: string) {
        if (!spillOver) return;

        if (SemanticRules.isInline(className)) {
            // Push left completely OUTSIDE the parent semantic-tag
            const prev = this.#parent.previousSibling;
            if (prev && prev.nodeType === Node.TEXT_NODE) {
                (prev as Text).appendData(spillOver);
            } else {
                const textNode = document.createTextNode(spillOver);
                this.#parent.parentNode?.insertBefore(textNode, this.#parent);
            }
        } else {
            // Push left before start-marker inside block tag
            const prev = this.previousSibling;
            if (prev && prev.nodeType === Node.TEXT_NODE) {
                (prev as Text).appendData(spillOver);
            } else {
                const textNode = document.createTextNode(spillOver);
                this.parentNode?.insertBefore(textNode, this);
            }
        }
    }

    private pullFromRight(className: string): string {
        const sibling = SemanticRules.isBlock(className)
            ? this.nextSibling
            : this.#parent.nextSibling;
        return sibling?.textContent?.slice(0, 20) || "";
    }

    private pushToRight(spillOver: string, className: string) {
        if (!spillOver) return;

        if (SemanticRules.isInline(className)) {
            const next = this.#parent.nextSibling;
            if (next && next.nodeType === Node.TEXT_NODE) {
                (next as Text).insertData(0, spillOver);
            } else {
                const textNode = document.createTextNode(spillOver);
                this.#parent.parentNode?.insertBefore(textNode, this.#parent.nextSibling);
            }
        } else {
            const next = this.nextSibling;
            if (next && next.nodeType === Node.TEXT_NODE) {
                (next as Text).insertData(0, spillOver);
            } else {
                const textNode = document.createTextNode(spillOver);
                this.parentNode?.insertBefore(textNode, this.nextSibling);
            }
        }
    }
}

if (!customElements.get('start-marker')) {
    customElements.define('start-marker', StartMarker);
}
