import { DomServicerFace } from './dom-servicer.ts';
import { SemanticTag } from './semantic-tag.ts';

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
                let codeContent = '';
                i++;
                while (i < lines.length && !Schema.BLOCK_CODE.test(lines[i])) {
                    codeContent += lines[i] + '\n';
                    i++;
                }
                const endMarker = i < lines.length ? lines[i] : '';
                
                const pre = new SemanticTag('```\n', codeContent);
                // Fix up the structure for code block specific needs
                const contentSpan = pre.querySelector('.content');
                if (contentSpan) {
                    const div = document.createElement('div');
                    div.className = 'code-content';
                    div.textContent = contentSpan.textContent;
                    pre.replaceChild(div, contentSpan);
                }
                
                if (endMarker === '') {
                    const endSpan = pre.querySelector('.marker.end');
                    if (endSpan) endSpan.textContent = '';
                }
                
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
            const el = new SemanticTag(hMatch[1] + ' ', '');
            this.parseInline(line.slice(hMatch[1].length + 1), el.querySelector('.content') as HTMLElement);
            return el;
        }
        if (Schema.BLOCK_LIST.test(line)) {
            const el = new SemanticTag('- ', '');
            this.parseInline(line.slice(2), el.querySelector('.content') as HTMLElement);
            return el;
        }
        const p = new SemanticTag();
        p.className = 'p';
        this.parseInline(line, p);
        return p;
    }

    parseInline(text: string, parent: HTMLElement) {
        const tokens = text.split(Schema.HTML_TAG);
        tokens.forEach(token => {
            if (Schema.HTML_TAG.test(token)) {
                const className = token.startsWith('<!--') ? 'marker html-comment' : 'marker html-tag';
                const span = document.createElement('span');
                span.className = className;
                span.textContent = token;
                parent.appendChild(span);
                return;
            }
            let lastIdx = 0;
            const combinedRegex = new RegExp(`${Schema.INLINE_BOLD.source}|${Schema.INLINE_ITALIC.source}|${Schema.INLINE_CODE.source}`, 'g');
            let match;
            while ((match = combinedRegex.exec(token)) !== null) {
                if (match.index > lastIdx) parent.appendChild(document.createTextNode(token.slice(lastIdx, match.index)));
                const marker = match[1] || match[3] || match[5];
                const content = match[2] || match[4] || match[6];
                
                const wrapper = new SemanticTag(marker, content);
                parent.appendChild(wrapper);
                
                lastIdx = combinedRegex.lastIndex;
            }
            if (lastIdx < token.length) parent.appendChild(document.createTextNode(token.slice(lastIdx)));
        });
    }
}
