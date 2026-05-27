import { SemanticRules } from "./semantic-rules.ts";
import type { SemanticTag } from "./semantic-tag.ts"

export class StartMarker extends HTMLElement {
    #parent!: SemanticTag; // Typed as any to completely avoid importing SemanticTag!

    #left: string = "";
    #middle: string = "";
    #right: string = "";

    constructor(marker: string = "") {
        super();
        this.classList.add('marker', 'start');
        this.textContent = marker;
    }

    reclass(content: string): string {
        this.textContent = content;

        // 1. Split raw text into boundary arms and syntax middle
        const { leftChars, middleChars, rightChars } = SemanticRules.split(content, this.#parent?.className || "");
        this.#left = leftChars;
        this.#middle = middleChars;
        this.#right = rightChars;

        // 2. Validate syntactic boundaries (wings)
        if (!this.checkWings()) return 'invalid';

        // 3. Return the class name represented by the syntax middle
        return SemanticRules.getClass(middleChars);
    }

    checkWings(): boolean {
        const targetClass = SemanticRules.getClass(this.#middle);
        const leftStatus = SemanticRules.checkLeftStatus(this.#left, targetClass, (cls) => this.pullFromLeft(cls));
        const rightStatus = SemanticRules.checkRightStatus(this.#right, targetClass, (cls) => this.pullFromRight(cls));
        return leftStatus.status === "valid" && rightStatus.status === "valid";
    }

    private pullFromLeft(className: string): string {
        const sibling = SemanticRules.isBlock(className)
            ? this.previousSibling
            : this.#parent.previousSibling;
        return sibling?.textContent?.slice(-20) || "";
    }

    private pullFromRight(className: string): string {
        const sibling = SemanticRules.isBlock(className)
            ? this.nextSibling
            : this.#parent.nextSibling;
        return sibling?.textContent?.slice(0, 20) || "";
    }

    connectedCallback() {
        const parentId = this.getAttribute('parent-id')!;
        this.#parent = (this.parentElement || document.getElementById(parentId)) as SemanticTag;
        this.#parent.startMarker = this;
    }
}

if (!customElements.get('start-marker')) {
    customElements.define('start-marker', StartMarker);
}
