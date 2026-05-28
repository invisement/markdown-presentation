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
    static readonly ZWS = '\u200B';
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
        return /^([\s\S]*?)(\u200B<[^>]*>)([\s\S]*)$/;
    }

    private static get FENCE_SPLIT_PATTERN(): RegExp {
        return /^([\s\S]*?)(\u200B`{3,}[a-zA-Z0-9]*)([\s\S]*)$/;
    }

    private static get MARKER_SPLIT_PATTERN(): RegExp {
        return new RegExp(`^([\\s\\S]*?)(\\u200B[${SemanticRules.markerString}]*)([\\s\\S]*)$`);
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
     * 1. AST Parser -> Start-Marker (ZWS-integrated)
     */
    static getMarkerFromAST(token: Token): string {
        const tagName = token.type;
        const ZWS = SemanticRules.ZWS;
        if (tagName === 'heading') return ZWS + '#'.repeat(token.depth || 1) + " ";
        if (tagName === 'list_item') return ZWS + '- ';
        if (tagName === 'strong') return ZWS + '**';
        if (tagName === 'em') return ZWS + '*';
        if (tagName === 'codespan') return ZWS + '`';
        if (tagName === 'code') return ZWS + '```\n';
        if (tagName === 'html') return ZWS + token.text;
        if (tagName === 'paragraph') return ZWS;
        if (tagName === 'text') return '';
        return '';
    }

    /**
     * 2. CSS Class Name -> Start-Marker (ZWS-integrated)
     */
    static getMarkerFromClass(cls: string): string {
        const ZWS = SemanticRules.ZWS;
        if (cls === 'b') return ZWS + '**';
        if (cls === 'i') return ZWS + '*';
        if (cls === 'code') return ZWS + '`';
        if (cls === 'li') return ZWS + '-';
        if (cls === 'pre') return ZWS + '```\n';
        if (cls.startsWith('h')) {
            const level = parseInt(cls.slice(1)) || 1;
            return ZWS + '#'.repeat(level);
        }
        return '';
    }

    /**
     * 3. Start-Marker -> CSS Class: Maps a ZWS-integrated start-marker to its CSS class name.
     */
    static getClass(marker: string): string {
        const ZWS = SemanticRules.ZWS;
        const normalized = marker.trimEnd();

        // Explicit mapping for empty/paragraph markers
        if (normalized === ZWS || normalized === '') return 'p';

        if (normalized === ZWS + '**') return 'b';
        if (normalized === ZWS + '*') return 'i';
        if (normalized === ZWS + '`') return 'code';
        if (normalized === ZWS + '-') return 'li';
        if (normalized === ZWS + '>') return 'blockquote';
        if (normalized.startsWith(ZWS + '```')) return 'pre';
        if (normalized.startsWith(ZWS + '<')) return 'html-tag';
        if (normalized === ZWS + '#') return 'h1';
        if (normalized === ZWS + '##') return 'h2';
        if (normalized === ZWS + '###') return 'h3';
        if (normalized === ZWS + '####') return 'h4';
        if (normalized === ZWS + '#####') return 'h5';
        if (normalized === ZWS + '######') return 'h6';

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
     * 4. Start-Marker -> End-Marker: Maps a ZWS-integrated start-marker to its expected closing counterpart.
     */
    static getClosingMarker(marker: string): string {
        const ZWS = SemanticRules.ZWS;
        const selfPairs = [ZWS + '*', ZWS + '`', ZWS + "'", ZWS + '"', ZWS + '~'];
        const matchingStarts = [ZWS + "{", ZWS + "[", ZWS + "(", ZWS + "<"];
        const matchingEnds = ["}", "]", ")", ">"];

        if (selfPairs.includes(marker)) {
            return marker.slice(1);
        }

        if (matchingStarts.includes(marker)) {
            let i = matchingStarts.indexOf(marker);
            if (i >= 0) return matchingEnds[i];
        }

        if (marker.startsWith(ZWS + '``')) {
            return marker.slice(1).match(/^`+/)?.[0] || '';
        }

        if (marker.startsWith(ZWS + '<')) {
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
