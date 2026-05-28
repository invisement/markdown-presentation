import { SemanticRules } from "./semantic-rules.ts";
import type { SemanticTag } from "./semantic-tag.ts"

export class StartMarker extends HTMLElement {
    #parent!: SemanticTag; // Typed as any to completely avoid importing SemanticTag!

    #left: string = "";
    #middle: string = "";
    #right: string = "";

    constructor() {
        super();
    }

    initFromParser(marker: string, parentId: string) {
        this.classList.add('marker', 'start');
        this.textContent = marker;
        this.setAttribute('parent-id', parentId);
    }

    initFromInput(content: string, parentId: string) {
        this.classList.add('marker', 'start');
        this.textContent = content;
        this.setAttribute('parent-id', parentId);
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

        this.#left = leftStatus.leftBorder;
        this.#right = rightStatus.rightBorder;

        this.pushToLeft(leftStatus.spillOver, targetClass);
        this.pushToRight(rightStatus.spillOver, targetClass);

        return leftStatus.status === "valid" && rightStatus.status === "valid";
    }

    private pushToLeft(spillOver: string, className: string) {
        if (!spillOver) return;
        const prev = SemanticRules.isInline(className) ? this.#parent.previousSibling : this.previousSibling;
        (prev as Text).appendData(spillOver);
    }

    private pushToRight(spillOver: string, className: string) {
        if (!spillOver) return;
        const next = SemanticRules.isInline(className) ? this.#parent.nextSibling : this.nextSibling;
        (next as Text).insertData(0, spillOver);
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
