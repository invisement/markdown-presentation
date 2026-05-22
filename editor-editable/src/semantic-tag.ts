/**
 * semantic-tag.ts — The Autonomous Controller for Markdown structures.
 */


const markerTypes = {
    inline: ["~", "`", "*", "_", "<"],
    block: ["-", "#", ">"],
    inlineClasses: ["i", "b", "code", "u", "html-tag"],
    blockClasses: ["li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"],
}



/**
 * SemanticRules — Centralized lookup for AST types, CSS classes, and pairing markers.
 */
export const SemanticRules = {
    /**
     * 1. AST -> Marker: Maps a parser AST type to its default start marker.
     */
    astToMarker(type: string, depth?: number): string {
        switch (type) {
            case 'heading': return '#'.repeat(depth || 1) + ' ';
            case 'list_item': return '- ';
            case 'strong': return '**';
            case 'em': return '*';
            case 'codespan': return '`';
            case 'code': return '```\n';
            default: return '';
        }
    },

    /**
     * 2. Marker -> CSS Class: Maps a start marker to its CSS presentation class.
     */
    markerToClass(marker: string, existingClass?: string): string {
        // Browsers inject non-breaking spaces (\u00a0) in contenteditable. We must strip them.
        const m = marker.trim().replace(/\u00a0/g, '');

        if (m === '') {
            if (existingClass) {
                const isBlock = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'p'].includes(existingClass);
                return isBlock ? 'p' : 'span';
            }
            return 'p';
        }

        if (m === '**') return 'b';
        if (m === '*') return 'i';
        if (m === '`') return 'code';
        if (m.startsWith('#')) return 'h' + m.length;
        if (m === '-') return 'li';
        if (m.startsWith('```')) return 'pre';
        if (m.startsWith('<')) return 'html-tag';

        return 'p';
    },

    /**
     * 3. Pairing Rules: Determines the expected opposite marker (symmetric or HTML tags).
     */
    getPair(marker: string, isStart: boolean, currentOpposite?: string): string {
        const selfPairs = ['*', '`', "'", '"', '~']
        const matchingStarts = ["{", "[", "(", "<"]
        const matchingEnds = ["}", "]", ")", ">"]

        const m = marker.trim();

        if (selfPairs.includes(m[0])) return m; // if any starts with a self mathcing char, return self
        if (matchingStarts.includes(m[0])) {
            let i = matchingStarts.indexOf(m);
            if (i >= 0) return matchingEnds[i];

            // for block code
            if (m.startsWith("``")) {
                return m.match(/^`+/)?.[0] || '';
            }

            // for html tags
            if (m.startsWith('<')) {
                const match = m.match(/<([a-z1-6]+)/i);
                if (match) return `</${match[1]}>`;
            }
        }


        // if it is not in the list like #, it needs no pair => empty
        return '';


        if (isStart) {
            let i = matchingStarts.indexOf(m);
            if (i >= 0) return matchingEnds[i];

            // for block code
            if (m.startsWith("``")) {
                return m.match(/^`+/)?.[0] || '';
            }

            // for html tags
            if (m.startsWith('<')) {
                const match = m.match(/<([a-z1-6]+)/i);
                if (match) return `</${match[1]}>`;
            }
        } else {
            let i = matchingEnds.indexOf(m);
            if (i >= 0) return matchingStarts[i];

            // for block code
            if (m.startsWith("``")) {
                const backticks = m.match(/^`+/)?.[0] || '';
                if (currentOpposite) {
                    const currentRest = currentOpposite.replace(/^`+/, '');
                    return backticks + currentRest;
                }
                return backticks;
            }

            // for html tag
            if (m.startsWith('</')) {
                const match = m.match(/<\/([a-z1-6]+)/i);
                if (match) return `<${match[1]}>`;
            }
        }


        return '';
    }
};

import { SemanticMarker } from './semantic-marker.ts';

function classToMarker(cls: string): string {
    if (cls === 'b') return '**';
    if (cls === 'i') return '*';
    if (cls === 'code') return '`';
    if (cls === 'li') return '- ';
    if (cls === 'pre') return '```\n';
    if (cls.startsWith('h')) {
        const level = parseInt(cls.slice(1)) || 1;
        return '#'.repeat(level) + ' ';
    }
    return '';
}

export class SemanticTag extends HTMLElement {
    #startMarker: HTMLElement | null = null; // includes defining boundries
    #endMarker: HTMLElement | null = null;  // includes defininf boundries

    fill(marker: string = "", content: string | Node[] = "") {
        // if (typeof content == "string") {
        //     content = [document.createTextNode(children)]
        // }

        console.log('class before fill', this.className, "masrker is", marker, "content is", content)

        const end = SemanticRules.getPair(marker, true);
        this.className = SemanticRules.markerToClass(marker);

        const startMarker = new SemanticMarker(marker, true);
        startMarker.className = 'marker start';

        const endMarker = new SemanticMarker(end, false);
        endMarker.className = 'marker end';


        this.append(startMarker, ...content, endMarker);

        return this;
    }

    constructor() {
        super();



        // const end = SemanticRules.getPair(marker, true);
        // this.className = SemanticRules.markerToClass(marker);

    }

    connectedCallback() {
        this.enforceStructure();

        const observer = new MutationObserver(() => {
            observer.disconnect();
            this.enforceStructure();
            observer.observe(this, { childList: true });
        });
        observer.observe(this, { childList: true });
    }

    private enforceStructure() {
        const cls = this.className;
        const markerChar = classToMarker(cls);
        if (!markerChar) return; // Plain tags (like "p") have no markers

        // 1. Enforce start marker
        const first = this.firstChild as HTMLElement;
        if (!first || first.tagName !== 'SEMANTIC-MARKER' || !first.classList.contains('start')) {
            const start = new SemanticMarker(markerChar, true);
            start.className = 'marker start';
            this.prepend(start);
        }

        // 2. Enforce end marker
        const last = this.lastChild as HTMLElement;
        const expectedEnd = SemanticRules.getPair(markerChar, true);
        if (expectedEnd && (!last || last.tagName !== 'SEMANTIC-MARKER' || !last.classList.contains('end'))) {
            const end = new SemanticMarker(expectedEnd, false);
            end.className = 'marker end';
            this.appendChild(end);
        }
    }

    public onMarkerRemove() {
        this.#endMarker?.remove();
        this.#startMarker?.remove();
        this.className = SemanticRules.markerToClass("", this.className);
    }

    public onMarkerChange(marker: string, isStart = true) {
        const pair = SemanticRules.getPair(marker, isStart);

        // if we dont check that pair is different from current, these twins will triger updating each other forever
        if (isStart && this.#endMarker!.textContent !== pair) {
            this.#endMarker!.textContent = pair
        }
        if (!isStart && this.#startMarker!.textContent !== pair) {
            this.#startMarker!.textContent = pair
        }

        this.className = SemanticRules.markerToClass(marker);
    }

    public grabLeft(isStart = true): string {
        const node = isStart ? this.previousSibling! : this.#endMarker!.previousSibling!;
        const leftString = node.textContent!.slice(-20);

        if (this.className === "li") {
            return leftString.match(/.\s*$/)![0];
        }
        return leftString.at(-1)!;
    }

    public grabRight(isStart = true): string {
        const isInline = ["b", "i", "code", "del"].includes(this.className);
        if (isInline) return "";

        const node = isStart ? this.#startMarker!.nextSibling! : this.nextSibling!;
        const rightString = node.textContent!.slice(0, 20);

        return rightString.at(0)!;
    }
}

if (!customElements.get('semantic-tag')) {
    customElements.define('semantic-tag', SemanticTag);
}
