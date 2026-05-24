/**
 * semantic-tag.ts — The Autonomous Controller for Markdown structures.
 */

import { SemanticRules } from './semantic-rules.ts';
import { StartMarker } from './start-marker.ts';
import './end-marker.ts';

export class SemanticTag extends HTMLElement {

    get isInline(): boolean {
        return SemanticRules.isInline(this.className);
    }

    get isBlock(): boolean {
        return SemanticRules.isBlock(this.className);
    }

    fill(marker: string = "", content: string | Node[] = "") {
        this.className = SemanticRules.getClass(marker);

        const startMarker = this.createStartMarker();
        const endMarker = this.createEndMarker();

        this.append(startMarker, ...content, endMarker);

        return this;
    }

    // Called when the start marker is deleted (user Backspace) to handle cleanup
    deletionEndMarker() {
        if (this.isInline) {
            const markers = this.querySelectorAll('.marker.end');
            for (const m of markers) m.remove();

            // Inline tag -> flatten (unwrap) the parent semantic-tag
            const parent = this.parentNode as any;
            if (parent) {
                for (const child of Array.from(this.childNodes)) {
                    parent.moveBefore(child, this);
                }
                this.remove();
            }
        }
    }

    // Called when the end marker is deleted (accidental delete / Enter split)
    resurrectionEndMarker() {
        const start = this.querySelector('.marker.start');
        if (!start) return; // No start marker -> no resurrection!

        const markerChar = SemanticRules.getMarkerFromClass(this.className);
        const expectedEnd = SemanticRules.getClosingMarker(markerChar);
        const freshEnd = this.createEndMarker();
        this.appendChild(freshEnd);
        console.debug('[Tag Enforce] Resurrected missing end marker:', expectedEnd, 'inside class:', this.className);
    }

    private createEndMarker() {
        const marker = SemanticRules.getMarkerFromClass(this.className);
        const endPair = SemanticRules.getClosingMarker(marker);
        const endMarker = document.createElement('semantic-end-marker');
        endMarker.className = 'marker end';
        endMarker.setAttribute('contenteditable', 'false');
        endMarker.textContent = endPair;
        return endMarker;
    }

    private createStartMarker() {
        const marker = SemanticRules.getMarkerFromClass(this.className);
        const startMarker = new StartMarker(marker);
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
        if (this.isInline) return "";

        const start = this.querySelector('.marker.start');
        const node = isStart ? start!.nextSibling! : this.nextSibling!;
        const rightString = node.textContent!.slice(0, 20);

        return rightString.at(0)!;
    }
}

if (!customElements.get('semantic-tag')) {
    customElements.define('semantic-tag', SemanticTag);
}
