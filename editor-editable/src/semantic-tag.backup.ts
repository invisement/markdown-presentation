/**
 * semantic-tag.ts — The Autonomous Controller for Markdown structures.
 */

import { SemanticRules } from './semantic-rules.ts';
import { StartMarker } from './start-marker.ts';
import './end-marker.ts';

export class SemanticTag extends HTMLElement {
    static nextId = 1;

    startMarker!: StartMarker;
    endMarker!: HTMLElement;

    constructor() {
        super();
        this.id = `semantic-tag-${SemanticTag.nextId++}`;
    }

    setData(marker: string = "", content: string | Node[] = "") {
        this.className = SemanticRules.getClass(marker);

        const startMarker = this.createStartMarker();
        const endMarker = this.createEndMarker();

        this.append(startMarker, ...content, endMarker);
    }

    connectedCallback() {
        // Run initial structural check on mount
        this.enforceStructure();
    }

    enforceStructure() {
        const start = this.startMarker;
        const end = this.endMarker;

        // Rule 1: if no end-marker (user CANT alter end-marker, deleted by browser): resurrect end-marker.
        if (!end || !end.isConnected) {
            this.resurrectEndMarker();
        }

        // Rule 2: if no start-marker (user deleted), delete end-marker. 
        // Then for inline, dissolve the semantic-tag parent; for block, reclass to p.
        if (!start || !start.isConnected) {
            if (this.endMarker) this.endMarker.remove();

            if (SemanticRules.isBlock(this.className)) {
                this.reclassBlockTag();
            } else {
                this.unwrapInlineTag();
            }
        }
    }

    private resurrectEndMarker() {
        const freshEnd = this.createEndMarker();
        this.appendChild(freshEnd);
        console.debug('[Tag Enforce] Resurrected missing end-marker inside class:', this.className);
    }

    private resurrectStartMarker() {
        const freshStart = this.createStartMarker();
        this.prepend(freshStart);
        console.debug('[Tag Enforce] Resurrected missing start-marker inside class:', this.className);
    }

    private reclassBlockTag() {
        // Block tag -> reclass to p (using SemanticRules to resolve paragraph class dynamically)
        const pClass = SemanticRules.getClass("") || 'p';
        this.className = pClass;

        // Repopulate paragraph boundaries
        this.resurrectStartMarker();
        this.resurrectEndMarker();
        console.debug('[Tag Enforce] Block start-marker deleted, reclassed to p and restored empty boundaries');
    }

    private unwrapInlineTag() {
        // Inline tag -> dissolve (unwrap) the semantic-tag parent
        const parent = this.parentNode as any;
        if (parent) {
            for (const child of Array.from(this.childNodes)) {
                parent.moveBefore(child, this);
            }
            this.remove();
        }
        console.debug('[Tag Enforce] Inline start-marker deleted, dissolved parent');
    }

    private createEndMarker() {
        const marker = SemanticRules.getMarkerFromClass(this.className);
        const endPair = SemanticRules.getClosingMarker(marker);
        const endMarker = document.createElement('end-marker');
        endMarker.className = 'marker end';
        endMarker.setAttribute('contenteditable', 'false');
        endMarker.textContent = endPair;
        endMarker.setAttribute('parent-id', this.id);
        return endMarker;
    }

    private createStartMarker() {
        let marker = SemanticRules.getMarkerFromClass(this.className);
        const startMarker = new StartMarker(marker);
        startMarker.className = 'marker start';
        startMarker.setAttribute('parent-id', this.id);
        return startMarker;
    }

}

if (!customElements.get('semantic-tag')) {
    customElements.define('semantic-tag', SemanticTag);
}
