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

### [X] Iteration 11: Decentralized Caret Boundaries
- **Goal:** Move away from heavy, global parent observers to self-contained caret boundary custom elements (`<semantic-marker>` and `<semantic-end-marker>`).
- **Feature:** Implement autonomous tag unwrapping and resurrection driven synchronously by native DOM element attachment/detachment lifecycles.

### [X] Iteration 12: Browser-Default Line Splits & Symmetrical Unwrapping
- **Goal:** Resolve unwrap recursion loops and premature unwrapping ("naked tags") when the browser natively splits line structures on Enter.
- **Feature:** Implement safe tag flattening using `moveBefore` to transfer nodes without triggering unmount lifecycles, and add selection safeguards in the input orchestrator to allow editing inside active markers without keypress interception.

### [X] Iteration 13: Pure Static Rules, Modular Markers & DOM Simplicity
- **Goal:** Centralize syntax rules into a cohesive namespace, isolate Zero-Width Space (ZWS) characters, split marker structures modularly, and strip redundant boilerplate.
- **Features:**
  - Designed the cohesive static `SemanticRules` class completely encapsulating private ZWS, NBSP, and regex splitters.
  - Implemented explicit, acrobatics-free AST and Class mapping helpers (`getMarkerFromAST`, `getMarkerFromClass`, `getClass`, `getClosingMarker`, `isMarker`).
  - Modularized caret elements by splitting them into single-responsibility custom elements: [start-marker.ts](file:///Users/khosro/Projects/markdown-presentation/editor-editable/src/start-marker.ts) and [end-marker.ts](file:///Users/khosro/Projects/markdown-presentation/editor-editable/src/end-marker.ts).
  - Purged the redundant `DomServicer` wrapper layer entirely, relying on high-performance native browser DOM APIs like `replaceChildren()` and `replaceWith()`.
  - Fixed a comment-matching regex scope bug inside the Husk Logic-Graph static analysis script.

### [X] Iteration 14: Centralized Boundary Enforcement & Passive Caret Triggers
- **Goal:** Fix the issue where splitting tags with Enter leaves cloned elements missing their start-markers, and eliminate active caretaker dependencies by establishing a pure parent-enforced lifecycle.
- **Completed Features:**
  - **Standard Element Names**: Standardized registration of caret tags as `<start-marker>` and `<end-marker>`.
  - **Centralized Enforcer**: Placed all boundary validation inside a unified `enforceStructure()` checkpoint in `<semantic-tag>`, partitioned into three clean, single-responsibility helper methods for maximum readability.
  - **Passive Lifecycle Triggers**: Configured standard `connectedCallback()` and `disconnectedCallback()` triggers on `<start-marker>` and `<end-marker>` elements to notify the parent `<semantic-tag>` upon lifecycle events.
  - **Logical Unwrapping & Demoting**: Formulated robust split rules (missing start-marker dissolves and clears inline formatting, and demotes block tags to plain paragraphs `p` using `SemanticRules` without hardcoding).

### [X] Iteration 15: Start-marker defining borders and left/right-boundary push/pull spillovers
- **Goal:** Resolve border styling issues on start-markers and implement left/right boundary push/pull spillovers using standard context pulling.
- **Completed Features:**
  - **Left and Right boundary checks**: Integrated `checkLeftStatus` and `checkRightStatus` to validate boundaries and determine spillovers.
  - **Virtual Sentinel evaluation**: Solved initial load crashes at the document start using pure, DOM-independent virtual newlines (`"\n"`).
  - **Push and Pull helpers**: Built symmetrical `pullFromLeft`, `pullFromRight`, `pushToLeft`, and `pushToRight` methods inside `StartMarker` to isolate DOM text node extraction and injection.

### [ ] Iteration 16: Verification and Integrity Check
- **Goal:** Go through all start-markers and print the CSS class, left boundary (`#left`), middle syntax (`#middle`), and right boundary (`#right`) states. Check if all resolved information is 100% correct. If any bugs arise, prioritize resolving them.

### [ ] Iteration 17: Unifying Marker Construction & Resolving Dual-Creation Path Debt
- **Goal:** Refactor `<semantic-tag>` to autonomously build and enforce its own marker structure upon connection, eliminating manual marker population in `.fill()` and removing defensive checks.

### [ ] Iteration 18: Purging Dynamic `EndMarker` Content Updates
- **Goal:** Completely eliminate Keystroke-level content updates to the paired `<end-marker>` from `StartMarker.validate()`, as closing markers only need to be populated during Markdown export, simplifying runtime orchestration.

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
- **Roundtrip**: The editor's `textContent` (either strictly at all moments, or weaker upon request/serialization) must always return the valid original Markdown source.
- **Muted Syntax**: `md-ctrl` elements should be visually distinct (grey/small/mono) but fully editable.

## Design Principles

### Fail-Fast / Trust the Happy Path
We strictly avoid defensive programming that "silences" structural errors. If an element's invariant is broken (e.g., a required marker span is unexpectedly deleted), we do **not** use early returns or optional chaining (e.g. `if (!element) return;`) to hide the error under the carpet. 

We trust the happy path and allow the application to throw a loud exception (e.g. `TypeError: Cannot read properties of null`). This "fail-fast" principle ensures that impossible-to-debug zombie states never exist in production, forcing us to correctly address the root structural bugs immediately during development.

### Code Freeze & SOLID Principles
We maintain a strict registry of top-level classes and their current status (Active vs. Frozen) in **`design/design.md`**. If a class is marked as **FROZEN** (like `SemanticTag`), no code changes may be made to it without explicit consultation and approval. We adhere strictly to the Open/Closed Principle.
