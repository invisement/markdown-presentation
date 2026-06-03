/**
 * semantic-rules.ts — Foundational rules, mappings, and constants.
 */

import { marked, Token } from 'marked';

export type { Token };

export interface MarkerParts {
    leftChars: string;
    middleChars: string;
    rightChars: string;
}

export interface BorderGrabber {
    (input: string): string | undefined;
}


export class SemanticRules {
    static readonly NBSP = '\u00a0';

    static readonly blockClasses = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'p', 'ul', 'ol', 'html-tag', 'blockquote'];
    static readonly inlineClasses = ['b', 'i', 'code', 'del', 'span', 'pre'];
    static readonly markers = ['*', '`', '~', '_', '#', '-', '>', '<'];
    static readonly blanks = [" ", "\t"]

    static readonly blankString = " \\t";
    static readonly markerString = "\\*\\`\\~\\_\\#\\-\\>\\<";

    private static get LEFT_BOUNDARY_PATTERN(): RegExp {
        return new RegExp(`^([\\s\\S]*?)([^${SemanticRules.blankString}][${SemanticRules.blankString}]*)$`);
    }

    private static get RIGHT_BOUNDARY_PATTERN(): RegExp {
        return new RegExp(`^([${SemanticRules.blankString}]*[^${SemanticRules.blankString}])([\\s\\S]*)$`);
    }

    private static get HTML_SPLIT_PATTERN(): RegExp {
        return /^([\s\S]*?)(<[^>]*>)([\s\S]*)$/;
    }

    private static get FENCE_SPLIT_PATTERN(): RegExp {
        return /^([\s\S]*?)(`{3,}[a-zA-Z0-9]*)([\s\S]*)$/;
    }

    private static get MARKER_SPLIT_PATTERN(): RegExp {
        return new RegExp(`^([\\s\\S]*?)([${SemanticRules.markerString}]*)([\\s\\S]*)$`);
    }


    static isInline(cls: string): boolean {
        return SemanticRules.inlineClasses.includes(cls);
    }

    static isBlock(cls: string): boolean {
        return SemanticRules.blockClasses.includes(cls);
    }

    static isMarker(char: string): boolean {
        return SemanticRules.markers.includes(char);
    }

    static isBlank(char: string): boolean {
        return SemanticRules.blanks.includes(char)
    }

    static astTokens(markdown: string) {
        return marked.lexer(markdown);
    }

    /**
     * 1. AST Parser -> Start-Marker
     */
    static getMarkerFromAST(token: Token): string {
        const tagName = token.type;
        if (tagName === 'heading') return '#'.repeat(token.depth || 1) + " ";
        if (tagName === 'list_item') return '- ';
        if (tagName === 'strong') return '**';
        if (tagName === 'em') return '*';
        if (tagName === 'codespan') return '`';
        if (tagName === 'code') return '```\n';
        if (tagName === 'html') return token.text;
        if (tagName === 'paragraph') return '';
        if (tagName === 'text') return '';
        return '';
    }

    /**
     * 2. CSS Class Name -> Start-Marker
     */
    static getMarkerFromClass(cls: string): string {
        if (cls === 'b') return '**';
        if (cls === 'i') return '*';
        if (cls === 'code') return '`';
        if (cls === 'li') return '-';
        if (cls === 'pre') return '```\n';
        if (cls.startsWith('h')) {
            const level = parseInt(cls.slice(1)) || 1;
            return '#'.repeat(level);
        }
        return '';
    }

    /**
     * 3. Start-Marker -> CSS Class: Maps a start-marker to its CSS class name.
     */
    static getClass(marker: string): string {
        const normalized = marker.trimEnd();

        // Explicit mapping for empty/paragraph markers
        if (normalized === '') return 'p';

        if (normalized === '**') return 'b';
        if (normalized === '*') return 'i';
        if (normalized === '`') return 'code';
        if (normalized === '-') return 'li';
        if (normalized === '>') return 'blockquote';
        if (normalized.startsWith('```')) return 'pre';
        if (normalized.startsWith('<')) return 'html-tag';
        if (normalized === '#') return 'h1';
        if (normalized === '##') return 'h2';
        if (normalized === '###') return 'h3';
        if (normalized === '####') return 'h4';
        if (normalized === '#####') return 'h5';
        if (normalized === '######') return 'h6';

        return 'invalid'; // Zero default fallback!
    }

    static validate(className: string, leftChars: string, rightChars: string): string {
        if (className === undefined || leftChars === undefined || rightChars === undefined) return "undefined";
        else return className;
    }

    static extractLeftParts(content: string): { spillOver: string, leftBorder: string } {
        const parts = content.match(SemanticRules.LEFT_BOUNDARY_PATTERN);
        if (!parts) { // means when content is nothing but blank
            return { spillOver: "", leftBorder: "" }
        }
        return { spillOver: parts[1], leftBorder: parts[2] }
    }

    static extractRightParts(content: string): { rightBorder: string, spillOver: string } {
        const parts = content.match(SemanticRules.RIGHT_BOUNDARY_PATTERN);
        return { rightBorder: parts![1], spillOver: parts![2] }
    }

    static checkLeftStatus(leftChars: string, className: string, pullExtra: (className: string) => string): { status: string, spillOver: string, leftBorder: string } {
        const ifBlankOnly = !leftChars.trim();

        if (ifBlankOnly) {// then it needs to pull extras
            const extra = pullExtra(className) || "\n";
            leftChars = extra + leftChars;
        }

        let { spillOver, leftBorder } = SemanticRules.extractLeftParts(leftChars);

        // condition: for block it must have \n, for inlines must have blank
        const char = leftBorder.at(-1)!;
        const isBorderValid = SemanticRules.isBlock(className) ? leftBorder.includes("\n") : SemanticRules.isBlank(char);

        const status = isBorderValid ? "valid" : "invalid";
        return { status, spillOver, leftBorder };
    }

    static checkRightStatus(rightChars: string, className: string, pullExtra: (className: string) => string): { status: string, spillOver: string, rightBorder: string } {
        // no check for inline
        if (SemanticRules.isInline(className)) return { status: "valid", spillOver: "", rightBorder: "" }

        const ifBlankOnly = !rightChars.trim();

        if (ifBlankOnly) {// then it needs to pull extras
            const extra = pullExtra(className) || "\n";
            rightChars = rightChars + extra;
        }

        // condition: block markers must come before a blank.
        const rightBorder = rightChars.slice(0, 1);
        const spillOver = rightChars.slice(1);
        const isBorderValid = SemanticRules.blanks.includes(rightBorder);
        const status = isBorderValid ? "valid" : "invalid";
        return { status, spillOver, rightBorder };
    }

    /**
     * 4. Start-Marker -> End-Marker: Maps a start-marker to its expected closing counterpart.
     */
    static getClosingMarker(marker: string): string {
        const selfPairs = ['*', '`', "'", '"', '~'];
        const matchingStarts = ["{", "[", "(", "<"];
        const matchingEnds = ["}", "]", ")", ">"];

        if (selfPairs.includes(marker)) {
            return marker;
        }

        if (matchingStarts.includes(marker)) {
            let i = matchingStarts.indexOf(marker);
            if (i >= 0) return matchingEnds[i];
        }

        if (marker.startsWith('``')) {
            return marker.match(/^`+/)?.[0] || '';
        }

        if (marker.startsWith('<')) {
            const match = marker.match(/<([a-z1-6]+)/i);
            if (match) return `</${match[1]}>`;
        }

        // for else which are blocks like p, h1, >, -
        return '';
    }

    /**
     * 5. Text-Splitting Regex & ZWS Abstraction
     */
    public static split(markersWithBorders: string, className: string = ""): MarkerParts {
        let pattern = SemanticRules.MARKER_SPLIT_PATTERN;
        if (className === 'pre') {
            pattern = SemanticRules.FENCE_SPLIT_PATTERN;
        } else if (className === 'html-tag') {
            pattern = SemanticRules.HTML_SPLIT_PATTERN;
        }

        const match = markersWithBorders.match(pattern);

        if (!match) {
            return { leftChars: "", middleChars: "", rightChars: markersWithBorders };
        }

        return {
            leftChars: match[1],
            middleChars: match[2],
            rightChars: match[3]
        };
    }

}
