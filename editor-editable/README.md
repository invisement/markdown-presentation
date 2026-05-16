# Structural Editor — ContentEditable

A high-performance, framework-free Markdown editor that treats syntax as first-class text. It looks like a styled document but remains "explicit"—all markdown markers (#, *, -) and HTML tags are visible, interactable, and styled to be muted.

## Iterations

We have successfully implemented the core architecture using a **Type-Driven Service Model**.

### 1. [X]: Parser + Editor Foundation
- [X] `MarkdownParser` class: Converts Markdown strings into structural DOM nodes.
- [X] `EditorCore` orchestrator: Connects user input to structural transformations.
- [X] **Features**: Headings (H1-H6), Bold, Italic, Inline Code, List Items, HTML Tags.

### 2. [X]: Remove event: Headings, li, p, bold, italic 
- [X] The Event Bus (Marker-Driven Reactivity)
- [X] **Zero-Observer Blocks**: Paragraphs and Headings are passive containers.
- [X] **Active Markers**: Only `md-ctrl` elements have `MutationObserver`.
- [X] **Symmetrical Syncing**: Editing one half of a pair (like `**`) automatically updates the other.
- [X] **Structural Swapping**: Changing `# ` to `## ` instantly transforms the container tag.
- [X] **Local Offset Logic**: No more cursor jumps! The editor saves the caret position before a structural swap and restores it perfectly in the new tag.
- [X] The "Space Rule": Enforced strict Markdown grammar: Block markers (Headings, Lists) only activate if followed by a space (`# `, `- `).
 
### 3. [X]: HTML Tags, Inline Code, and Block Logic
- [X] **Structural Integrity**: Decoupled HTML tag and inline code handling from the main event loop.
- [X] **Surgical Unwrapping**: Implemented `unwrapNode` to cleanly remove tags when markers are deleted while preserving text.
- [X] **Asset Management**: Fixed build pipeline to correctly handle nested asset directories (`input/`).
- [X] **Tracing & Cleanliness**: Removed "surgery" terminology and established a standard tracing flow for state transitions.

### 4.- [x] **Iteration 4**: Behavioral Traceability.
    - [x] Implement Husk Logic-Graph utility.
    - [x] Map Service-to-Service method dependencies.
    - [x] Map PubSub event-flow (Publisher -> Topic -> Subscriber).
    - [x] Enforce architectural invariants through visualization.


### 5. [ ] Iteration 5: Logical Decoupling & SOLID Refactoring
The current logic graph reveals complex, multi-service relationships. This iteration focuses on simplifying these interactions:
- **SOLID Principles**: Aim for "Open for Extension, Closed for Modification." We will explore patterns to extend service behavior without mutating existing core classes.
- **Narrative Interfaces**: Simplify agent (interface) contracts. A service should "tell a story" to its neighbors with minimal, focused methods.
- **Complexity Reduction**: Use the logic-graph to identify and eliminate direct service-to-service coupling in favor of cleaner event-driven patterns.

- [ ] Generic Syntax Highlighting for code blocks.
- [ ] Direct file storage integration.


## Architecture

The project is built with TypeScript and bundled via `esbuild`.

- **`types.ts`**: Formal Go-style interfaces for all services.
- **`dom.ts`**: `DomService` — Handles creation, swapping, and cursor management.
- **`parser.ts`**: `MarkdownParser` — Handles grammar and re-parsing.
- **`index.ts`**: `EditorCore` — The central orchestrator and event bus.

## Development

This project is part of a Deno 2 workspace. To develop locally:

1. Ensure `deno` is installed.
2. Run `deno task dev` from the project root.
3. The editor is bundled into `editor-editable/dist/index.js`.
4. Open `http://localhost:8000/editor-editable/index.html`.

## Verification Invariant
- **Roundtrip**: `editor.innerText` must always return the valid original Markdown source.
- **Muted Syntax**: `md-ctrl` elements should be visually distinct (grey/small/mono) but fully editable.
