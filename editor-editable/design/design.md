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




## Events and Pubsub

in event driven solutions (like js/ui), we will have a emiting events and receiving events. I am more aligned with pubsub class.
Then in project's pubsub.js we can write:

mdCtrl = new Pubsub () (husk has it)
    mdCtrl.pub(publisher1.publishVal)
    mdCtrl.sub(subscriber1.handler)

(We might have to deal with variable and closure scoping and using arrow functions)

the biggest advantage is we know what happens. I believe random calls of different methods are evil. we should see the flow. here pubsub is the onlyone that know the logic: these objects publish this value (or function) and these objects do this method with it.
It would be better method name to be clear not "handler" more what major action is going to be taken (verb).


