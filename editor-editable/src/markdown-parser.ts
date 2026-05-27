import { SemanticTag } from './semantic-tag.ts';
import { SemanticRules, Token } from './semantic-rules.ts';

/**
 * Contract for Markdown grammar and parsing.
 */
export interface MarkdownParserFace {
    parse(markdown: string): DocumentFragment;
}

/**
 * MarkdownParser — Translates Markdown strings into surgical DOM structures using Marked.
 */
export class MarkdownParser implements MarkdownParserFace {
    constructor() { }

    parse(markdown: string): DocumentFragment {
        const fragment = document.createDocumentFragment();
        const tokens = SemanticRules.astTokens(markdown);

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
            token.items?.forEach((item: Token) => fragment.appendChild(this.buildNodeBottomUp(item)));
            return fragment;
        }

        const isHtml = token.type === 'html';
        const children: Node[] = ('tokens' in token && token.tokens)
            ? (token.type === 'list_item'
                ? token.tokens.flatMap(child =>
                    (SemanticRules.getMarkerFromAST(child) === '')
                        ? ('tokens' in child && child.tokens
                            ? child.tokens.map(nestedChild => this.buildNodeBottomUp(nestedChild))
                            : [document.createTextNode((child as any).text || '')]
                        )
                        : [this.buildNodeBottomUp(child)]
                )
                : token.tokens.map(child => this.buildNodeBottomUp(child))
            )
            : (!isHtml && 'text' in token && token.text)
                ? [document.createTextNode(token.text)]
                : [];

        const marker = SemanticRules.getMarkerFromAST(token);
        const tag = new SemanticTag();
        tag.data = { marker, content: children };
        return tag;
    }
}
