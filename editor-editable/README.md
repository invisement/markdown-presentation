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


### 5. [x] Iteration 5: Autonomous Components & Logical Decoupling
- [x] **Autonomous Components**: Replaced `md-tag` with a self-managing `SemanticTag` class that handles its own Light DOM (`.marker`, `.content`).
- [x] **Zero Tag Swapping**: Eliminated global tag-swapping. The component dynamically changes its CSS class based on its internal markers.
- [x] **Event Encapsulation**: Attached `MutationObserver`s locally inside the component instead of relying on a global event bus for syntax parsing.
- [x] **Code Freeze Registry**: Established strict SOLID modification protocols in `design/design.md` for freezing core structural files.


### 6. [x] Iteration 6. PubSub & Event Decoupling
- [x] **Event Audit**: Evaluated the necessity of global PubSub flow in the new architecture.
- [x] **Zero-Coupling**: Confirmed that the autonomous `SemanticTag` completely eliminates the need for cross-component tag-swapping events.
- [x] **Cleanup**: Emptied `pubsub-flow.ts` and removed all premature `addEventListener` and `bus` bindings, ensuring the editor remains entirely decoupled from global event loops for now.

### [X] Iteration 7. parser
- [X] decide on a markdown engine: Marked is our choice for its simple nested AST.
    - Market-it: no because it was flat, was the second option. Remared was too detailed and too much info we do not need (like cursor management), codeMirror engine: too generic.
- [X] rewrite parser to use it
- [X] simpler logic for semantic-tag web component

### [X] Iteration 8. make marker into web component
- [X] Created `<semantic-marker>` custom element in Light DOM to cleanly capture native lifecycle events like `disconnectedCallback` on deletion.
- [X] Replaced the local `MutationObserver` inside `<semantic-tag>` with local child TextNode observation inside the marker.
- [X] Wired global PubSub orchestration inside `pubsub-flow.ts` to coordinate sibling sync and class updates on marker changes and deletions.

### [X] Iteration 9: Zero-Width Space (ZWS) and Immutable Intervals
- **ZWS in Opening Markers:** Explore placing a Zero-Width Space (`\u200B`) at the start of opening markers. This creates an incredibly tactile editor feeling:
  - First backspace empties the visible marker characters.
  - Second backspace deletes the ZWS and tears down the component.
- **Interval Concept:** When the user starts a tag/marker, they open an interval with active bounds (start and end markers). They can empty the start marker and type anything else, seamlessly shifting styles on the fly.

### [X] Iteration 10: Block Splitting on Enter (The 3 Options Debate)
We are currently evaluating three design paths for block creation on Enter:
1. **Keep Styles (Current):** Clones the active block style (e.g., `- ` for list item) and nested inline styles to the new line.
2. **Plain Paragraph Shift:** Always start the new line as a completely plain paragraph (`class="p"`) with no inline formatting.
   - *Why:* It's far simpler, cleaner, and matches native markdown behaviors where starting a new style is as easy as typing a single marker or indent.

### [X] Iteration 11: Dynamic Boundary & Neighborhood Tracking
- Implement neighborhood boundary scanning to dynamically check surrounding characters (`markersWithBorders`) for instant activation.
- Ensure that if an opening marker becomes invalid, it keeps its DOM structure but removes visual styling and sets the closing marker to `display: none`.

### [ ] Iteration 12: back to browser default
we focus on implementing "break or press enter key" this time through 1) accepting browser behavior and then correcting it (listening to input and not beforeinput).
Based on what I have seen, it seems browser does a good job excpet it moves them out of the container semantic-tag.
2) I am thinking of having ZWSP at the beginning if semantic-markers so that it says for one more keystroke after getting empty. It helps with two aspects: the user has time to change the tag into something else like from ## to ```. More impoertanly though, Observer can detect getting empty (change) before getting deleted/removed. This might even change our idea of using web components which comes with own edge case (lie shadow dom and etc).
changing to div might actually help us in "enter" and cloning.


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

## Design Principles

### Fail-Fast / Trust the Happy Path
We strictly avoid defensive programming that "silences" structural errors. If an element's invariant is broken (e.g., a required marker span is unexpectedly deleted), we do **not** use early returns or optional chaining (e.g. `if (!element) return;`) to hide the error under the carpet. 

We trust the happy path and allow the application to throw a loud exception (e.g. `TypeError: Cannot read properties of null`). This "fail-fast" principle ensures that impossible-to-debug zombie states never exist in production, forcing us to correctly address the root structural bugs immediately during development.

### Code Freeze & SOLID Principles
We maintain a strict registry of top-level classes and their current status (Active vs. Frozen) in **`design/design.md`**. If a class is marked as **FROZEN** (like `SemanticTag`), no code changes may be made to it without explicit consultation and approval. We adhere strictly to the Open/Closed Principle.
