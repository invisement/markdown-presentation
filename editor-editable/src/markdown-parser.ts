import { marked, Token } from 'marked';
import { SemanticTag, SemanticRules } from './semantic-tag.ts';

/**
 * Contract for Markdown grammar and parsing.
 */
export interface MarkdownParserFace {
    parse(markdown: string): DocumentFragment;
}

/**
 * Markdown Grammar Schema - kept for block tag detection in Orchestrator
 */
export const Schema = {
    BLOCK_HEADER: /^(#{1,6})\s/,
    BLOCK_LIST: /^-\s/,
    BLOCK_CODE: /^```/,
};

function getMarkerForToken(token: Token): string {
    if (token.type === 'html') return token.text;
    return SemanticRules.astToMarker(token.type, (token as any).depth);
}

/**
 * MarkdownParser — Translates Markdown strings into surgical DOM structures using Marked.
 */
export class MarkdownParser implements MarkdownParserFace {
    constructor() { }

    parse(markdown: string): DocumentFragment {
        const fragment = document.createDocumentFragment();
        const tokens = marked.lexer(markdown);

        for (const token of tokens) {
            if (token.type === 'space') continue;
            fragment.appendChild(this.buildNodeBottomUp(token));
        }
        return fragment;
    }

    private buildNodeBottomUp(token: Token): Node {
        if (token.type === 'text' && !('tokens' in token)) {
            return document.createTextNode(token.text);
        }

        if (token.type === 'list') {
            const fragment = document.createDocumentFragment();
            token.items?.forEach(item => fragment.appendChild(this.buildNodeBottomUp(item)));
            return fragment;
        }

        const isHtml = token.type === 'html';
        const children: Node[] = ('tokens' in token && token.tokens)
            ? (token.type === 'list_item'
                ? token.tokens.flatMap(child =>
                    (getMarkerForToken(child) === '')
                        ? ('tokens' in child && child.tokens
                            ? child.tokens.map(nestedChild => this.buildNodeBottomUp(nestedChild))
                            : [document.createTextNode(child.text || '')]
                        )
                        : [this.buildNodeBottomUp(child)]
                )
                : token.tokens.map(child => this.buildNodeBottomUp(child))
            )
            : (!isHtml && 'text' in token && token.text)
                ? [document.createTextNode(token.text)]
                : [];

        const marker = getMarkerForToken(token);
        return new SemanticTag().fill(marker, children);
    }
}
