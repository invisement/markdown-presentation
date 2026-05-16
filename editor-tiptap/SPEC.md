# Markdown Editor Specification

This document outlines the desired outcome, requirements, and criteria for the modular markdown editors (e.g., Tiptap, EasyMDE).

## Core Philosophy
The editor should feel like a natural extension of the viewer, balancing "Premium" aesthetics with extreme maintenance "Lightness".

## Requirements & Criteria

### 1. Visual Feel & Continuity
- **Viewer Alignment**: The editor's look and feel should be similar (but not identical) to the presentation viewer.
- **Muted Markers**:
    - Markdown syntax markers (e.g., `**`, `#`, `>`) must remain visible.
    - Markers should be styled to be **very small and grey (muted)**.
    - The actual style (Bold, Header, etc.) must still be applied to the text while the markers are visible.
    - *Goal*: Provide the clarity of raw markdown with the visual feedback of a WYSIWYG.
- **html tag**: custom html tag should be styled (either muted or highlighted).

### 2. Syntax Highlighting
- **Minimalist Approach**: Implement minimal syntax highlighting for code blocks.
- **Readability**: The highlighting should serve only to improve readability, not to be a full IDE-like experience.
- **Maintenance**: Avoid micromanagement. No complex custom lexers or heavy reliance on manual regex. Use the editor engine's native capabilities or lightweight libraries.

### 3. Lightness & Maintenance
- **Prioritize Simplicity**: "Ultra-light to light" is the preferred weight.
- **Easily Managed**: The codebase must be easy to manage and maintain over time.
- **Native ESM**: Leverage Deno 2 workspaces and native browser modules where possible.

### 4. Technical Integration (The Contract)
All editors must implement a unified interface to be swappable:
- `init(element: HTMLElement, options: EditorOptions)`
- `getValue(): string`
- `setValue(content: string)`
- `focus()`
- `destroy()`

## Accepted Implementation Strategies
- **Tiptap (ProseMirror)**: Best for extensions features and granular control over markers.
- **EasyMDE (CodeMirror)**: Best for a robust, traditional markdown experience.
- **ProseMirror (Raw)**: For when extreme lightness and custom marker logic are required.
