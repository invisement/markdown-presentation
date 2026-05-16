import { DomServicerFace } from './dom-servicer.ts';

/**
 * Contract for Markdown grammar and parsing.
 */
export interface MarkdownParserFace {
    parseDocument(markdown: string): DocumentFragment;
    parseBlock(line: string): HTMLElement;
    parseInline(text: string, parent: HTMLElement): void;
}

/**
 * Markdown Grammar Schema
 */
export const Schema = {
    BLOCK_HEADER: /^(#{1,6})\s/,
    BLOCK_LIST: /^-\s/,
    BLOCK_CODE: /^```/,
    INLINE_BOLD: /(\*\*)(.*?)\1/g,
    INLINE_ITALIC: /(\*)(.*?)\1/g,
    INLINE_CODE: /(`)(.*?)\1/g,
    HTML_TAG: /(<[\/!]?[a-z1-6]+.*?>)/gi,
};

/**
 * MarkdownParser — Translates Markdown strings into surgical DOM structures.
 */
export class MarkdownParser implements MarkdownParserFace {
    constructor(private dom: DomServicerFace) {}

    parseDocument(markdown: string): DocumentFragment {
        const fragment = document.createDocumentFragment();
        const lines = markdown.split('\n');
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            if (Schema.BLOCK_CODE.test(line)) {
                const pre = this.dom.createNode('pre', '', 'code-block');
                pre.appendChild(this.dom.createNode('md-ctrl', line + '\n'));
                const content = this.dom.createNode('div');
                content.classList.add('code-content');
                i++;
                while (i < lines.length && !Schema.BLOCK_CODE.test(lines[i])) {
                    content.appendChild(document.createTextNode(lines[i] + '\n'));
                    i++;
                }
                pre.appendChild(content);
                if (i < lines.length) pre.appendChild(this.dom.createNode('md-ctrl', lines[i]));
                fragment.appendChild(pre);
                i++;
                continue;
            }
            fragment.appendChild(this.parseBlock(line));
            i++;
        }
        return fragment;
    }

    parseBlock(line: string): HTMLElement {
        const hMatch = line.match(Schema.BLOCK_HEADER);
        if (hMatch) {
            const el = this.dom.createNode('h' + hMatch[1].length);
            el.appendChild(this.dom.createNode('md-ctrl', hMatch[1] + ' '));
            this.parseInline(line.slice(hMatch[1].length + 1), el);
            return el;
        }
        if (Schema.BLOCK_LIST.test(line)) {
            const el = this.dom.createNode('li');
            el.appendChild(this.dom.createNode('md-ctrl', '- '));
            this.parseInline(line.slice(2), el);
            return el;
        }
        const p = this.dom.createNode('p');
        this.parseInline(line, p);
        return p;
    }

    parseInline(text: string, parent: HTMLElement) {
        const tokens = text.split(Schema.HTML_TAG);
        tokens.forEach(token => {
            if (Schema.HTML_TAG.test(token)) {
                const className = token.startsWith('<!--') ? 'html-comment' : 'html-tag';
                parent.appendChild(this.dom.createNode('md-ctrl', token, className));
                return;
            }
            let lastIdx = 0;
            const combinedRegex = new RegExp(`${Schema.INLINE_BOLD.source}|${Schema.INLINE_ITALIC.source}|${Schema.INLINE_CODE.source}`, 'g');
            let match;
            while ((match = combinedRegex.exec(token)) !== null) {
                if (match.index > lastIdx) parent.appendChild(document.createTextNode(token.slice(lastIdx, match.index)));
                const marker = match[1] || match[3] || match[5];
                const content = match[2] || match[4] || match[6];
                const tag = match[1] ? 'b' : (match[3] ? 'i' : 'code');
                const wrapper = this.dom.createNode(tag);
                wrapper.appendChild(this.dom.createNode('md-ctrl', marker));
                wrapper.appendChild(document.createTextNode(content));
                wrapper.appendChild(this.dom.createNode('md-ctrl', marker));
                parent.appendChild(wrapper);
                lastIdx = combinedRegex.lastIndex;
            }
            if (lastIdx < token.length) parent.appendChild(document.createTextNode(token.slice(lastIdx)));
        });
    }
}
