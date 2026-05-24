/**
 * semantic-rules.ts — Foundational rules, mappings, and constants.
 */

import { marked, Token } from 'marked';

export type { Token };

export interface MarkerParts {
    leftChar: string;
    middleChar: string;
    rightChar: string;
}

export class SemanticRules {
    static readonly ZWS = '\u200B';
    static readonly NBSP = '\u00a0';

    static readonly blockClasses = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'p', 'ul', 'ol'];
    static readonly inlineClasses = ['b', 'i', 'code', 'del', 'span', 'html-tag'];
    static readonly markers = ['*', '`', '~', '_', '#', '-'];

    static isInline(cls: string): boolean {
        return SemanticRules.inlineClasses.includes(cls);
    }

    static isBlock(cls: string): boolean {
        return SemanticRules.blockClasses.includes(cls);
    }

    static isMarker(char: string): boolean {
        return SemanticRules.markers.includes(char);
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
        if (tagName === 'heading') return ZWS + '#'.repeat(token.depth || 1) + ' ';
        if (tagName === 'list_item') return ZWS + '- ';
        if (tagName === 'strong') return ZWS + '**';
        if (tagName === 'em') return ZWS + '*';
        if (tagName === 'codespan') return ZWS + '`';
        if (tagName === 'code') return ZWS + '```\n';
        if (tagName === 'html') return ZWS + token.text;
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
        if (cls === 'li') return ZWS + '- ';
        if (cls === 'pre') return ZWS + '```\n';
        if (cls.startsWith('h')) {
            const level = parseInt(cls.slice(1)) || 1;
            return ZWS + '#'.repeat(level) + ' ';
        }
        return '';
    }

    /**
     * 3. Start-Marker -> CSS Class: Maps a ZWS-integrated start-marker to its CSS class name.
     */
    static getClass(marker: string): string {
        const ZWS = SemanticRules.ZWS;
        const NBSP = SemanticRules.NBSP;
        if (marker === ZWS + '**') return 'b';
        if (marker === ZWS + '*') return 'i';
        if (marker === ZWS + '`') return 'code';
        if (marker === ZWS + '- ' || marker === ZWS + '-' + NBSP) return 'li';
        if (marker.startsWith(ZWS + '```')) return 'pre';
        if (marker.startsWith(ZWS + '<')) return 'html-tag';

        // Explicit heading match
        if (marker.startsWith(ZWS + '#') && (marker.endsWith(' ') || marker.endsWith(NBSP))) {
            const level = marker.slice(1, -1).length; // Skip ZWS and trailing space to count '#'
            if (level >= 1 && level <= 6) return 'h' + level;
        }

        return 'p';
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

        return '';
    }

    /**
     * 5. Text-Splitting Regex & ZWS Abstraction
     */
    private static split(markersWithBorders: string): MarkerParts {
        const pattern = /^([^*`~#\-><]*)([*`~#\-><]+)([\s\S]*)$/;
        const match = markersWithBorders.match(pattern);

        if (!match) {
            return { leftChar: "", middleChar: "", rightChar: markersWithBorders };
        }

        return {
            leftChar: match[1],
            middleChar: match[2],
            rightChar: match[3]
        };
    }

    static splitMarker(newText: string): MarkerParts {
        const ZWS = SemanticRules.ZWS;
        const hasZws = newText.startsWith(ZWS);
        const textWithoutZws = hasZws ? newText.slice(1) : newText;
        const parts = SemanticRules.split(textWithoutZws);

        return {
            leftChar: parts.leftChar,
            middleChar: ZWS + parts.middleChar,
            rightChar: parts.rightChar
        };
    }
}
