import type { SemanticTag } from "./semantic-tag.ts";

export class SemanticMarker extends HTMLElement {
    public isStart = true;
    #parent!: SemanticTag;
    #observer = new MutationObserver(() => {
        this.compareAndSync(this.textContent!);
    });

    constructor(marker: string = "", isStart = true) {
        super();
        this.textContent = marker;
        this.isStart = isStart;
        if (!isStart) {
            this.setAttribute('contenteditable', 'false');
        }
    }

    connectedCallback() {
        if (!this.textContent) { // means it is initiated by html tag, no args, now properties avaiulable and we can use them
            this.textContent = this.getAttribute('marker');
            this.isStart = !this.hasAttribute('is-end'); // if is-end is missing, go default is-start
        }

        if (!this.isStart) {
            this.setAttribute('contenteditable', 'false');
        }

        this.#parent = this.parentElement as SemanticTag
        this.#observer.observe(this, { characterData: true, subtree: true });

        if (this.textContent === "") return;

        this.compareAndSync(this.textContent!);
    }

    private compareAndSync(newText: string) {
        if (newText === "" && this.isStart) {
            this.remove();
            return;
        }

        const cssClass = this.#parent.className;

        const isValid = this.validateParts(cssClass);
        if (isValid) {
            this.classList.remove('semantic-alarm');
            this.classList.add('valid');
        } else {
            this.classList.remove('valid');
            this.classList.add('semantic-alarm');
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
