/**
 * types.ts — Formal Go-style interface contracts for the Semantic Editor.
 * This file serves as the absolute "Architectural Spec" and single source of truth 
 * for module contracts, preventing circular dependencies at compile-time.
 */

import { Token } from 'marked';
export type ParserToken = Token & {
    tokens?: ParserToken[];
    text?: string;
    items?: ParserToken[];
};

/**
 * Contract for Markdown grammar and parsing.
 */
export interface MarkdownParserFace {
    parse(markdown: string): Node[];
}


/**
 * 1. Semantic Tag Contract (The Parent Element)
 * An observer-free custom Web Component container representing a parsed Markdown style.
 */
export interface SemanticTagFace extends HTMLElement {
    /** Unique sequential identifier e.g. "semantic-tag-5" */
    id: string;

    /** Reference to its active left caretaker boundary element */
    startMarker: StartMarkerFace;

    /** Reference to its active right caretaker boundary element */
    endMarker: HTMLElement;

    /** Setter to build the children wings and resolve parent styles */
    startMarkerContent: string;

    /** Explicit entry point for static parser loads */
    dataFromParser: { marker: string; content: string | Node[] };

    /** Natively validates boundary carets and heals missing end-markers */
    enforceStructure(): void;
}

/**
 * 2. Start Marker Contract (The Active Left Caret)
 * An active, observer-driven caretaker boundary element that handles raw text
 * mutations, evaluates style transitions, and pushes/pulls sibling context.
 */
export interface StartMarkerFace extends HTMLElement {
    /** 
     * Splits text content, runs boundary validation, and returns the newly 
     * resolved CSS class name (or "invalid" if boundaries are breached).
     */
    reclass(content: string): string;

    /** Verifies left and right borders to ensure they satisfy formatting rules */
    checkWings(): boolean;
}

/**
 * 3. End Marker Contract (The Passive Right Caret)
 * A passive caretaker boundary element indicating the closing format syntax.
 */
export interface EndMarkerFace extends HTMLElement {
    // Passive element, inherits standard HTMLElement
}

/**
 * 4. Markdown Parser Contract
 * Translates flat Markdown strings into a surgical, nested DOM tree.
 */
export interface MarkdownParserFace {
    /** Parses raw Markdown text into a fully qualified DOM DocumentFragment */
    parse(markdown: string): DocumentFragment;
}

/**
 * 5. Editor Orchestrator Contract
 * Coordinates user input topics, triggers formatting wraps, and loads sample documents.
 */
export interface EditorOrchestratorFace {
    /** Gracefully loads initial sample documents into the active editor DOM */
    loadSample(): Promise<void>;

    /** Intercepts keystroke inputs to dynamically wrap selections in SemanticTags */
    handleInput(e: InputEvent): void;
}
