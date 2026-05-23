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
    }
}

import { SemanticMarker } from './semantic-marker.ts';

export function classToMarker(cls: string): string {
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

    fill(marker: string = "", content: string | Node[] = "") {
        this.className = SemanticRules.markerToClass(marker);

        const startMarker = this.createStartMarker();
        const endMarker = this.createEndMarker();

        this.append(startMarker, ...content, endMarker);

        return this;
    }

    // Called when the start marker is deleted (user Backspace) to delete end marker and flatten (unwrap) the parent semantic-tag
    deletionEndMarker() {
        const markers = this.querySelectorAll('.marker.end');
        for (const m of markers) m.remove();

        const parent = this.parentNode as any;
        if (parent) {
            for (const child of Array.from(this.childNodes)) {
                parent.moveBefore(child, this);
            }
            this.remove();
        }
    }

    // Called when the end marker is deleted (accidental delete / Enter split)
    resurrectionEndMarker() {
        const start = this.querySelector('.marker.start');
        if (!start) return; // No start marker -> no resurrection!

        const markerChar = classToMarker(this.className);
        const expectedEnd = SemanticRules.getPair(markerChar, true);
        const freshEnd = this.createEndMarker();
        this.appendChild(freshEnd);
        console.debug('[Tag Enforce] Resurrected missing end marker:', expectedEnd, 'inside class:', this.className);
    }

    private createEndMarker() {
        const marker = classToMarker(this.className);
        const endPair = SemanticRules.getPair(marker, true);
        const endMarker = document.createElement('semantic-end-marker');
        endMarker.className = 'marker end';
        endMarker.setAttribute('contenteditable', 'false');
        endMarker.textContent = endPair;
        return endMarker;
    }

    private createStartMarker() {
        const marker = classToMarker(this.className);
        const startMarker = new SemanticMarker(marker);
        startMarker.className = 'marker start';
        return startMarker;
    }

    public grabLeft(isStart = true): string {
        const start = this.querySelector('.marker.start');
        const end = this.querySelector('.marker.end');
        const node = isStart ? this.previousSibling! : end!.previousSibling!;
        const leftString = node.textContent!.slice(-20);

        if (this.className === "li") {
            return leftString.match(/.\s*$/)![0];
        }
        return leftString.at(-1)!;
    }

    public grabRight(isStart = true): string {
        const isInline = ["b", "i", "code", "del"].includes(this.className);
        if (isInline) return "";

        const start = this.querySelector('.marker.start');
        const node = isStart ? start!.nextSibling! : this.nextSibling!;
        const rightString = node.textContent!.slice(0, 20);

        return rightString.at(0)!;
    }
}

if (!customElements.get('semantic-tag')) {
    customElements.define('semantic-tag', SemanticTag);
}
