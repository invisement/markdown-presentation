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

### Beyond the Bus: Logical Dependency
It is important to note that PubSub is only one layer of the software logic. The total **Logical Dependency** of the system—which we aim to capture in the dependency graph—includes:
- **Direct Function Calls**: Synchronous interactions between services (e.g., `EditorOrchestrator` calling `DomServicer.swapNodes`).
- **Web Component Hooks**: Lifecycle logic within `connectedCallback` and `disconnectedCallback`.
- **External Effects**: Direct calls to browser APIs like `window.getSelection()` or `document.replaceWith()`.

The purpose of the **Method Dependency Graph** (Iteration 4) is to visualize *all* these relationships, ensuring that both event-driven flows and direct method calls remain traceable and maintainable.


### Method Dependency Graph

To ensure behavioral integrity, we use the `husk/utils/logic-graph.ts` utility to generate a **Logical Dependency Graph**. This tool performs static analysis to map:

1.  **Service-to-Service Calls**: Direct method invocations between classes like `EditorOrchestrator` and `DomServicer`.
2.  **PubSub Flows**: Explicit mapping of `Publisher -> Topic -> Subscriber`, making the "hidden" event-driven logic visible and traceable.
3.  **Browser API Surface**: Tracking where and how we interact with `document`, `window`, and `MutationObserver`.

This graph serves as our **Architectural Truth**, allowing us to verify that logic flows correctly and that invariants (such as direct DOM manipulation outside of `DomServicer`) are strictly avoided.
we can dicuss how to get a list of targeted ("important or crucial or interesting") method/functions/objects.
When we have them, a little text parser in js or go can tracerse line by line. first find the context (which class.method this line belongs too) then bag all targeted functions/method/object that the line calls for that context. 






