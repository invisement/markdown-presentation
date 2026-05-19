/**
 * semantic-tag.ts — The Autonomous Controller for Markdown structures.
 */

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

        if (selfPairs.includes(m[0])) return m; // if any starts with a self mathcing char, return self

        return '';
    }
};

import { SemanticMarker } from './semantic-marker.ts';

export class SemanticTag extends HTMLElement {
    #startMarker: HTMLElement | null = null;
    #endMarker: HTMLElement | null = null;

    fill(marker: string = "", children: string | Node[] = "") {
        if (typeof children == "string") {
            children = [document.createTextNode(children)]
        }

        const end = SemanticRules.getPair(marker, true);
        this.className = SemanticRules.markerToClass(marker);

        const startMarker = new SemanticMarker(marker, true);
        startMarker.className = 'marker start';

        const endMarker = new SemanticMarker(end, false);
        endMarker.className = 'marker end';


        this.append(startMarker, ...children, endMarker);

        return this;
    }

    connectedCallback() {
        this.#startMarker = this.querySelector('semantic-marker.start');
        this.#endMarker = this.querySelector('semantic-marker.end');
    }

    public onMarkerRemove() {
        this.#endMarker?.remove();
        this.#startMarker?.remove();
        this.className = SemanticRules.markerToClass("", this.className);
    }

    public onMarkerChange(marker: string, isStart = true) {
        const pair = SemanticRules.getPair(marker, isStart);

        if (isStart && this.#endMarker!.textContent !== pair) {
            this.#endMarker!.textContent = pair
        }
        if (!isStart && this.#startMarker!.textContent !== pair) {
            this.#startMarker!.textContent = pair
        }

        this.className = SemanticRules.markerToClass(marker);
    }
}

if (!customElements.get('semantic-tag')) {
    customElements.define('semantic-tag', SemanticTag);
}
