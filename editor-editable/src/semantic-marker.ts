import type { SemanticTag } from "./semantic-tag.ts";

export class SemanticMarker extends HTMLElement {
    #isStart = true;
    #parent!: SemanticTag;
    #observer = new MutationObserver(() => {
        this.compareAndSync(this.textContent!);
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

            console.debug(this, "is created with hatml tag or natively by browser", this.textContent, this.#isStart)

        }

        this.#parent = this.parentElement as SemanticTag
        this.#observer.observe(this, { characterData: true, subtree: true });

        if (this.textContent === "") return;

        this.compareAndSync(this.textContent!);
    }

    #leftChar = "";
    #middleChar = "";
    #rightChar = "";

    private compareAndSync(newText: string) {
        const cssClass = this.#parent.className;
        const next = this.nextSibling!;
        const prev = this.#parent.previousSibling!;

        const { leftChar: newLeft, middleChar: newMiddle, rightChar: newRight } = split(newText, cssClass);

        if (newRight !== this.#rightChar) {
            if (newRight.length > this.#rightChar.length) {
                const extra = newRight.slice(this.#rightChar.length);
                next.textContent = extra + next.textContent;
                this.textContent = newLeft + newMiddle + this.#rightChar;
            } else {
                const rightText = next.textContent!;
                if (rightText.startsWith(" ") || rightText.startsWith("\u00a0")) {
                    next.textContent = rightText.slice(1);
                    this.textContent = newLeft + newMiddle + " ";
                }
            }
        }

        if (newLeft !== this.#leftChar && this.#isStart) {
            if (newLeft.length > this.#leftChar.length) {
                const extra = newLeft.slice(this.#leftChar.length);
                prev.textContent = prev.textContent + extra;
                this.textContent = this.#leftChar + newMiddle + newRight;
            } else {
                const leftText = prev.textContent!;
                if (leftText.endsWith(" ") || leftText.endsWith("\u00a0")) {
                    prev.textContent = leftText.slice(0, -1);
                    this.textContent = " " + newMiddle + newRight;
                }
            }
        }

        const finalParts = split(this.textContent!, cssClass);
        this.#leftChar = finalParts.leftChar;
        this.#middleChar = finalParts.middleChar;
        this.#rightChar = finalParts.rightChar;

        const isValid = this.validateParts(cssClass);
        if (isValid) {
            this.classList.remove('semantic-alarm');
            this.classList.add('valid');
            this.#parent.onMarkerChange(this.#middleChar + this.#rightChar, this.#isStart);
        } else {
            this.classList.remove('valid');
            this.classList.add('semantic-alarm');
            this.#parent.onMarkerChange("", this.#isStart);
        }
    }

    private validateParts(_cssClass: string): boolean {
        return true;
    }

}

export interface MarkerParts {
    leftChar: string;
    middleChar: string;
    rightChar: string;
}
// /^([^~]*)(~[\s\S]*~|~)([^~]*)$/

function getPatternForClass(cssClass: string): RegExp {
    if (/^h[1-6]$/.test(cssClass)) return /^([^#]*)(#[\s\S]*#|#)([^#]*)$/;
    if (cssClass === "b" || cssClass === "i") return /^([^\*_]*)(\*[\s\S]*\*|\*|_[\s\S]*_|_)([^\*_]*)$/;
    if (cssClass === "del") return /^([^~]*)(~[\s\S]*~|~)([^~]*)$/;
    if (cssClass === "li") return /^([^-]*)(-[\s\S]*-|-)([^-]*)$/;
    if (cssClass === "pre") return /^([^`]*)(`[\s\S]*`|`)([^`]*)$/;
    if (cssClass === "code") return /^([^`]*)(\`[\s\S]*\`|\`)([^`]*)$/;
    if (cssClass === "html-tag") return /^([^<]*)(<[\s\S]*>)([^>]*)$/;
    return /^()(.*)()$/
}

export function split(markersWithBorders: string, cssClass: string): MarkerParts {
    const pattern = getPatternForClass(cssClass);
    const match = markersWithBorders.match(pattern)! || ["", "", "", ""];
    if (!match) { // null means empty initiation,
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
