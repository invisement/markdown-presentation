# Structural Editor Design (Service-Oriented)

This editor is a framework-free, high-performance Markdown editor based on native `contenteditable` and a marker-driven event bus.

## Core Architecture

The system is built as a set of decoupled services that communicate via standard DOM events.

### 1. The Marker-Driven Event Bus
Instead of observing every keystroke, we only observe the **Markdown Markers** (`md-ctrl`).
- **Input**: User modifies a marker (e.g., `# ` -> `## `).
- **Signal**: The marker's `MutationObserver` dispatches an `md:ctrl-change` event.
- **Action**: The `EditorCore` receives the event and decides whether to sync a partner or swap the parent tag.

### 2. Services (The Contracts)

#### `DomService` (DOM Manipulation)
- **Responsibility**: Creation, transformation (swap), and cursor management.
- **Philosophy**: Use `anchorOffset` to maintain focus during structural changes.

#### `MarkdownParser` (Grammar)
- **Responsibility**: Turning Markdown strings into structural DOM trees.
- **Philosophy**: Including the trailing space (e.g., `# `) inside the marker to signify block intent.

#### `EditorCore` (Orchestration)
- **Responsibility**: State transitions and event routing.
- **Philosophy**: "Melt" markers into text when they are no longer valid by re-parsing the line.

## Key Principles

1. **The Space Rule**: Block markers like `# ` or `- ` must include a trailing space to be active.
2. **Silent Syncing**: Partner markers (like the second `**`) are updated via a silent `syncContent` method that doesn't trigger redundant events.
3. **Muted Syntax**: Markers are real text nodes but are styled to be "muted" via CSS, maintaining a clean WYSIWYG feel without losing the structural source of truth.

## Event Sequence

1. **Change Detected**: `MutationObserver` on `<md-ctrl>` triggers.
2. **Event Dispatched**: `md:ctrl-change` bubbles to document.
3. **Decision Made**: `getTargetTag()` checks if a swap is needed.
4. **DOM Manipulation**: `DomService` performs a `swap()` or `re-parse()`.
5. **Cursor Restored**: `anchorOffset` is re-applied to the new node.

## Architecture Invariants

These are non-negotiable design decisions that must be followed. Any deviation must be discussed and approved.

### 1. Caret Preservation (Local Node Strategy)
- **The Rule**: Always use the **Local `anchorOffset`** within the triggering node for restoration.
- **Why**: Browsers track the target node instance perfectly; only the offset within that node is lost during structural swaps.
- **Implementation**: 
    1. Save `savedOffset = sel.anchorOffset` before the swap.
    2. Perform the swap (The browser naturally tracks the `anchorNode` as it moves).
    3. Get the **current** `node = sel.anchorNode`.
    4. Call `sel.collapse(node, savedOffset)` to ensure the cursor is perfectly placed.
- **Constraint**: Never use global character-offset scanning.

### 2. Explicit Markdown Source
- **The Rule**: `editor.innerText` MUST always return the valid original Markdown source.
- **Constraint**: No "phantom" nodes or hidden data that doesn't exist in the Markdown.

### 3. DOM Encapsulation (Exclusive Ownership)
- **The Rule**: `DomServicer` is the **exclusive** owner of all DOM mutations.
- **Constraint**: No other class or service (e.g., `EditorOrchestrator`, `MarkdownParser`) may call native DOM methods that modify the structure (like `replaceWith`, `appendChild`, `remove`, `innerHTML`, etc.).
- **Implementation**: All structural changes must go through the `DomServicerFace` contract (`swapNodes`, `replaceNode`, `removeNode`).

## Naming and Implementation Philosophy (Go-Style)

- **Interfaces are Agent Faces**: We use the `Face` suffix for interfaces to signify they are the contract/interface of an agent.
    - Example: `DomServicerFace` is the interface, `DomServicer` is the doer.
- **Types are Attributes**: Use the `type` keyword for data structures, event payloads, and constants.
- **Readability**: Method names must read like English sentences when called.
    - Example: `domServicer.swapNodes(node, newTag)` is preferred over `domServicer.execute(node, tag)`.




## PubSub

We use an explicit **PubSub** mechanism to manage event-driven reactivity, specifically for the lifecycle of Markdown markers (`md-ctrl`). This ensures that reactive changes are declarative and visible.

### Event-Driven Logic
While much of the system's structure is governed by direct service orchestration, PubSub handles the "active" part of the editor:
- **Marker Mutations**: When an `md-ctrl` element is modified, it publishes to the `markerChanged` topic.
- **Reactive Actions**: The `EditorOrchestrator` subscribes to these topics to perform surgical updates, such as syncing paired markers or swapping block tags.

### Behavioral Traceability
Structural graphs (imports) only tell half the story. To maintain architectural integrity, we use the **Husk Logic-Graph** utility to visualize real-time behavior.

- **Logical Flow**: We prioritize the `Publisher -> Topic -> Subscriber` flow over internal wiring.
- **Interactive Truth**: The generated `reports/logic-graph.dot` includes interactive `URL` and `tooltip` attributes, allowing developers to jump directly from a node in the graph to the corresponding source file.
- **Noise Suppression**: Orchestration logic (like `setupFlow` or `main`) is suppressed to keep the graph focused on pure business logic interactions between services and Browser APIs.
- **Invariant Enforcement**: Any direct cross-service coupling that appears in the graph without an event-driven justification is a candidate for refactoring in Iteration 5.

This graph serves as our **Architectural Truth**, allowing us to verify that logic flows correctly and that invariants (such as direct DOM manipulation outside of `DomServicer`) are strictly avoided.

## Additional Engineering Principles

### 1. Fail-Fast / Trust the Happy Path
We strictly avoid defensive programming that "silences" structural errors. If an element's invariant is broken (e.g., a required marker span is unexpectedly deleted), we do **not** use early returns or optional chaining (e.g., `if (!element) return;`) to hide the error under the carpet. 

We trust the happy path and allow the application to throw a loud exception (e.g., `TypeError: Cannot read properties of null`). This "fail-fast" principle ensures that impossible-to-debug zombie states never exist in production, forcing us to correctly address the root structural bugs immediately during development.

### 2. On-Demand Building
Not every small code change requires a full end-to-end test or build. Do not run the global build command (`deno task dev:build`) reflexively after minor updates. Trust the code changes, and only run full builds when a significant milestone is reached or when explicitly requested.

### 3. Strict Refactoring Definition
When we say "Refactor", it has a very specific meaning: **No logic or major code changes.** Refactoring means strictly reorganizing existing logic—moving files, splitting classes, stitching components together, renaming, or restructuring. If business logic *must* be changed, we do it *after* the initial refactor is complete, and only with careful deliberation. We do not mix logic changes with structural refactoring.

## Web Components Guidelines

One of the flaws of JS/TS is having too many ways to achieve the same result. To ensure consistency, simplicity, and maximum performance across our custom elements, we strictly adhere to the following patterns:

### 1. Atomic Node Moving & Observer Cleanup
When moving Web Components within the DOM, **always use `moveBefore`** instead of the legacy `remove()` + `appendChild()` / `insertBefore()` pattern. 
- Using `moveBefore` ensures an atomic move, preventing `disconnectedCallback` and `connectedCallback` from redundantly firing and disrupting the component's state.
- Because of this atomic move rule, we **do not manually disconnect `MutationObserver`s** inside `disconnectedCallback`. We completely omit the `disconnectedCallback` and rely on the browser's Garbage Collector to automatically destroy the observer when the element is permanently removed from the DOM.
- For safety against legacy browser behavior, always guard `connectedCallback` with `if (this.#observer) return;` to prevent duplicate observer attachments.

### 2. Light DOM Construction
Do not use `document.createElement` when injecting structural spans inside a component's constructor or `buildTemplate` method. Use template strings and `innerHTML` for the structural skeleton, and securely inject user content via `.textContent` on the queried elements. This prevents XSS and HTML corruption (since Markdown characters like `<` are treated as literal text) while maintaining clean, readable component code.

### 3. Element Caching
Never use `querySelector` inside high-frequency lifecycle methods like `MutationObserver` callbacks. Always query and cache your internal DOM nodes (e.g., `this.#startMarker`) during `buildTemplate` or `connectedCallback`, and use the cached private properties everywhere else.

## Code Freeze & SOLID Modification Protocols

This section lists the top-level objects in our architecture, their responsibilities, and their current modification status. 

**Rule of Thumb:** We adhere strictly to the Open/Closed Principle. We do not modify existing core classes simply to "expand" functionality (e.g., adding a new syntax style). Core logic should only change if the underlying rules or architecture *must* change.

If a class is marked as **FROZEN**, no code changes may be made to it without explicit consultation and confirmation from the project lead.

### 1. `SemanticTag` (`src/semantic-tag.ts`)
- **Status:** 🔴 **FROZEN**
- **Responsibility:** The autonomous Web Component that builds its own Light DOM (`.marker`, `.content`), manages its state via CSS classes, and handles its own `MutationObserver` for pair-syncing.
- **Why it exists:** To decouple syntax reactivity from the global DOM, providing a rock-solid, zero-tag-swap editing experience.
- **Modification Rule:** Do not touch the observer or rendering logic. If you need a new markdown style, you add a single line to the `getStyleClass` mapping function. The core class is sealed.

### 2. `MarkdownParser` (`src/markdown-parser.ts`)
- **Status:** 🟡 **ACTIVE** (Nearing Freeze)
- **Responsibility:** Translates raw Markdown AST into `SemanticTag` instantiations.
- **Why it exists:** The editor needs a reliable, one-way translator to convert flat strings into our surgical, nested component tree.
- **Modification Rule:** Can be modified to support new Markdown grammar or fix parsing bugs, but its output signature (returning `SemanticTag` nodes) must not change.

### 3. `EditorOrchestrator` (`src/editor-orchestrator.ts`)
- **Status:** 🟡 **ACTIVE** (Pending Refactor)
- **Responsibility:** Manages global editor interactions, such as block-level input handling and loading initial states.
- **Why it exists:** To route global events that a single `SemanticTag` cannot handle (e.g., a user pressing Enter and splitting a block into two).
- **Modification Rule:** Open for modification. As components become more autonomous, this class should shrink.

### 4. `DomServicer` (`src/dom-servicer.ts`)
- **Status:** 🟡 **ACTIVE** (Deprecated Path)
- **Responsibility:** Originally managed all tag swapping and centralized DOM logic.
- **Why it exists:** To act as the exclusive agent for DOM manipulation (preventing cursor jumps).
- **Modification Rule:** Open for modification/deletion. Since `SemanticTag` now handles its own state without swapping tags, `DomServicer`'s role is severely reduced and may be phased out entirely soon.


