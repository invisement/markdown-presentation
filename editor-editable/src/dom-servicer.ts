/**
 * DomServicer — The exclusive agent for DOM manipulation and structural changes.
 * This file contains both the Face (Contract) and the Doer (Implementation).
 */


export type MdNodeTag = 'P' | 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6' | 'LI' | 'B' | 'I' | 'CODE' | 'PRE';

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

}

const TAG_MAP: Record<string, string> = {
    'p': 'block', 'li': 'block',
    'h1': 'block', 'h2': 'block', 'h3': 'block',
    'h4': 'block', 'h5': 'block', 'h6': 'block',
    'pre': 'block',
    'span': 'html-tag',
    'b': 'inline', 'i': 'inline', 'code': 'inline',
    'semantic-tag': 'semantic-tag'
};


export class DomServicer implements DomServicerFace {

    createNode(tag: string, text?: string, className?: string): HTMLElement {
        const type = TAG_MAP[tag.toLowerCase()] || 'inline';
        const el = (type === 'semantic-tag')
            ? document.createElement('semantic-tag')
            : document.createElement(tag);

        if (text) el.textContent = text;
        if (className) el.classList.add(className);

        return el;
    }


    replaceNode(oldNode: HTMLElement, newNode: Node | DocumentFragment) {
        const sel = window.getSelection();
        const offset = sel?.anchorOffset ?? 0;

        oldNode.replaceWith(newNode);

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

        const newParent = this.createNode(newTag);
        newParent.append(...parent.childNodes);
        parent.replaceWith(newParent);

        if (sel && sel.anchorNode) {
            try { sel.collapse(sel.anchorNode, offset); } catch (e) { /* Caret restore failed */ }
        }
        return newParent;
    }

    unwrapNode(node: HTMLElement) {
        node.before(...node.childNodes);
        node.remove();
    }
}
