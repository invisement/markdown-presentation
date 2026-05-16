/**
 * DomServicer — The exclusive agent for DOM manipulation and structural changes.
 * This file contains both the Face (Contract) and the Doer (Implementation).
 */

export type MdNodeTag = 'P' | 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6' | 'LI' | 'B' | 'I' | 'CODE' | 'PRE';

/**
 * Contract for the md-ctrl custom element (The Marker).
 */
export interface MarkerFace extends HTMLElement {
    syncContent(val: string): void;
    _observer?: MutationObserver;
}

/**
 * Payload for marker modification topics.
 */
export type MarkerTopicValue = {
    marker: MarkerFace;
    content: string;
    parent: HTMLElement;
};

/**
 * Payload for marker removal topics.
 */
export type MarkerRemovedTopicValue = {
    marker: HTMLElement;
    lastParent: HTMLElement;
};

/**
 * Contract for DOM manipulation and structural changes.
 */
export interface DomServicerFace {
    createNode(tag: string, text?: string, className?: string): HTMLElement;
    replaceNode(oldNode: HTMLElement, newNode: Node | DocumentFragment): void;
    removeNode(node: HTMLElement): void;
    insertBefore(parent: HTMLElement, newNode: Node, referenceNode: Node): void;
    clearAndAppend(parent: HTMLElement, fragment: DocumentFragment): void;
    swapNodes(node: HTMLElement, newTag: MdNodeTag): HTMLElement;
    unwrapNode(node: HTMLElement): void;

    /**
     * PASSIVE HOOKS: Wire these to topics in pubsub.ts
     */
    onMarkerMutation(cb: (v: MarkerTopicValue) => void): void;
    onMarkerRemoved(cb: (v: MarkerRemovedTopicValue) => void): void;
}

const TAG_MAP: Record<string, string> = {
    'p': 'block', 'li': 'block',
    'h1': 'block', 'h2': 'block', 'h3': 'block',
    'h4': 'block', 'h5': 'block', 'h6': 'block',
    'pre': 'block',
    'span': 'html-tag',
    'b': 'inline', 'i': 'inline', 'code': 'inline',
    'md-ctrl': 'md-ctrl'
};

class MdCtrl extends HTMLElement implements MarkerFace {
    #lastParent: HTMLElement | null = null;
    _observer?: MutationObserver;
    static onRemoved?: (v: MarkerRemovedTopicValue) => void;

    connectedCallback() {
        this.#lastParent = this.parentElement;
    }

    disconnectedCallback() {
        const lastParent = this.#lastParent;
        const marker = this;
        queueMicrotask(() => {
            if (this.isConnected || !lastParent) return;
            if (MdCtrl.onRemoved) MdCtrl.onRemoved({ marker, lastParent });
        });
    }

    syncContent(val: string) {
        if (!this._observer) {
            this.textContent = val;
            return;
        }
        this._observer.disconnect();
        this.textContent = val;
        this._observer.observe(this, { characterData: true, childList: true, subtree: true });
    }
}

if (!customElements.get('md-ctrl')) {
    customElements.define('md-ctrl', MdCtrl);
}

export class DomServicer implements DomServicerFace {
    private _mutationCb?: (v: MarkerTopicValue) => void;

    onMarkerMutation(cb: (v: MarkerTopicValue) => void) {
        this._mutationCb = cb;
    }

    onMarkerRemoved(cb: (v: MarkerRemovedTopicValue) => void) {
        MdCtrl.onRemoved = cb;
    }

    createNode(tag: string, text?: string, className?: string): HTMLElement {
        const type = TAG_MAP[tag.toLowerCase()] || 'inline';
        const el = (type === 'md-ctrl')
            ? document.createElement('md-ctrl')
            : document.createElement(tag);

        if (text) el.textContent = text;
        if (className) el.classList.add(className);

        if (type === 'md-ctrl') {
            this.attachObserver(el as MarkerFace, () => {
                if (this._mutationCb) {
                    console.debug(`[TRACE] DomServicer | marker mutation | new content: "${el.textContent}"`);
                    this._mutationCb({
                        marker: el as MarkerFace,
                        content: el.textContent || '',
                        parent: el.parentElement!
                    });
                }
            });
        }

        return el;
    }

    private attachObserver(node: MarkerFace, callback: () => void): MutationObserver {
        const config = { characterData: true, childList: true, subtree: true };
        const obs = new MutationObserver(callback);
        obs.observe(node, config);
        node._observer = obs;
        return obs;
    }

    replaceNode(oldNode: HTMLElement, newNode: Node | DocumentFragment) {
        const sel = window.getSelection();
        const offset = sel?.anchorOffset ?? 0;
        console.debug(`[TRACE] replaceNode | BEFORE | anchorNode:`, sel?.anchorNode, `offset:`, offset);

        oldNode.replaceWith(newNode);

        console.debug(`[TRACE] replaceNode | AFTER | anchorNode:`, sel?.anchorNode, `offset:`, sel?.anchorOffset);
        if (sel && sel.anchorNode) {
            try { sel.collapse(sel.anchorNode, offset); } catch (e) { /* Caret restore failed */ }
        }
    }

    removeNode(node: HTMLElement) {
        node.remove();
    }

    insertBefore(parent: HTMLElement, newNode: Node, referenceNode: Node) {
        parent.insertBefore(newNode, referenceNode);
    }

    clearAndAppend(parent: HTMLElement, fragment: DocumentFragment) {
        parent.innerHTML = '';
        parent.appendChild(fragment);
    }

    swapNodes(node: HTMLElement, newTag: MdNodeTag): HTMLElement {
        const parent = node.parentElement;
        if (!parent) return node;
        const sel = window.getSelection();
        const offset = sel?.anchorOffset ?? 0;
        console.debug(`[TRACE] swapNodes | BEFORE | anchorNode:`, sel?.anchorNode, `offset:`, offset);

        const newParent = this.createNode(newTag);
        newParent.append(...parent.childNodes);
        parent.replaceWith(newParent);

        console.debug(`[TRACE] swapNodes | AFTER | anchorNode:`, sel?.anchorNode, `offset:`, sel?.anchorOffset);
        if (sel && sel.anchorNode) {
            try { sel.collapse(sel.anchorNode, offset); } catch (e) { /* Caret restore failed */ }
        }
        return newParent;
    }

    unwrapNode(node: HTMLElement) {
        console.debug(`[FLOW] unwrapNode | removing <${node.tagName.toLowerCase()}> and preserving children`);
        node.before(...node.childNodes);
        node.remove();
    }
}
