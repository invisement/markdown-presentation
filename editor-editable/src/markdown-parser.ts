import { SemanticTag } from './semantic-tag.ts';
import { SemanticRules, Token } from './semantic-rules.ts';

import type { MarkdownParserFace, ParserToken } from "./types.ts"

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
            fragment.appendChild(this.parseToken(token));
        }
        return fragment;
    }

    private parseToken(token: ParserToken): Node {
        const { tokens, text, items } = token;
        const fragment = document.createDocumentFragment();


        // 1. Flatten list container by returning a DocumentFragment
        if (items) {
            items.forEach(item => {
                fragment.appendChild(this.parseToken(item));
            });
            return fragment;
        }

        if (tokens) {
            fragment.append(...tokens.map(token => this.parseToken(token)))
        } else {
            fragment.append(text!)
        }

        const marker = SemanticRules.getMarkerFromAST(token);

        if (marker === "") {
            return fragment;
        }

        // 3. Create semantic-tag container
        const tag = document.createElement("semantic-tag") as SemanticTag;

        tag.dataFromParser = { marker, content: fragment };
        return tag;
    }
}
