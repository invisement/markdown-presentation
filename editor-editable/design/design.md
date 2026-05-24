# Structural Editor Design (Service-Oriented)

This editor is a framework-free, high-performance Markdown editor based on native `contenteditable` and a marker-driven event bus.


## Architectural & Coding Principles

### 1. Code Style & Philosophy
- **Never Patch, Always Architect:** Do not write quick fixes or deeply nested if/else statements to bypass a bug. Analyze the root cause. If an abstraction, custom hook, or utility function is needed, refactor rather than patch.
- **Dry & Concise:** Prioritize clean, minimal code. Avoid verbose boilerplate. Use modern ES6+, TypeScript utilities, and idiomatic framework patterns (e.g., compound components in React, composition API in Vue).
- **No Deletions/Placeholders:** Do not truncate code or leave "// rest of the code here" comments unless explicitly asked.

### 2. Think Before Coding
- Before emitting any code, provide a 2-sentence maximum architectural summary of *why* you are structuring the solution this way.
- If the requested change violates SOLID principles or our existing project patterns, call it out and propose the correct pattern before writing a single line.

### 3. Pair Programing 
We are doing pair programing, I ask question and use your superior knowledge and technical ability. I rather you write most codes here. If I approved, I'll tell you to move it to the code base, or I do it.

### 4. Pacing & Scope
- **One Iteration Per Session:** Every session is devoted to at most one iteration.
- **Incremental Planning:** Each session typically consists of around 20 chat turns before completion. Therefore, plans must be sized rationally, targeting 10% to 100% of a single iteration per session, never more.



## Core Architecture

The system is built as a set of autonomous, self-contained custom web components that handle their own states synchronously and communicate directly with each other.

### 1. Decentralized Caret Boundaries
Instead of a global orchestrator or broad DOM observers, each Markdown component manages its own boundaries natively:
- **State Presentation (`<semantic-tag>`)**: An observer-free tag container whose styling class (e.g. `b`, `i`, `code`, `h1`) serves as the single source of truth and enforces its own structure.
- **Start Caret (`<start-marker>`)**: Captures keystrokes, performs text validation, handles style swaps, and pushes out spillover text synchronously. It triggers the parent's structural check on lifecycle events.
- **End Caret (`<end-marker>`)**: A passive paired boundary caret that triggers the parent's structural check on connection and disconnection.

### 2. Autonomous Lifecycles & Centralized Enforcement
- **Centralized Enforcement**: `<semantic-tag>`'s `enforceStructure()` is the exclusive method that validates boundaries. Start and end carets act as passive triggers calling `enforceStructure()` upon connection or disconnection.
- **Symmetrical End Caret Healing**: If the `<end-marker>` is missing (cloning or splitting), the parent automatically resurrects it.
- **Logical Format Unwrapping**: If the `<start-marker>` is deleted on an inline tag, the parent removes the end-marker and flattens/unwraps the tag structure. If it is a block tag, it demotes the tag to a plain paragraph (`p`).
- **High-Performance Native Promotion (`moveBefore`)**: The parent tag uses the experimental, high-performance `moveBefore` DOM translation API during unwrap procedures, moving children cleanly without unmounting them and bypassing redundant lifecycle reactions.

## Key Principles

1. **The Space Rule**: Block markers like `# ` or `- ` must include a trailing space to be active.
2. **Dynamic Format Swapping**: The start marker's text is the controller of the state. Typing inside the marker updates the text, which dynamically recalculates and swaps the parent tag's class.
3. **Muted Syntax**: Markers are real, visible text nodes but are styled to be "muted" via index.css, maintaining a beautiful WYSIWYG feel without losing the markdown source of truth.
4. **The `textContent` Pillar (Not `innerText`)**: The editor's `textContent` is our absolute architectural source of truth for generating valid Markdown. We completely reject the use of `innerText` because it triggers expensive browser layout reflows and behaves inconsistently across platforms. This is governed by two rules:
    - **Strict Rule**: The editor's raw `textContent` at any given moment yields the exact, valid, desired Markdown.
    - **Weaker Rule**: Upon request, `textContent` through a layout-independent update/transformation (such as joining block `textContent` elements with newlines) yields the legit desired Markdown.

## Caret Validation Sequence

1. **Typing**: The user types a character inside `<semantic-marker>`.
2. **Evaluation**: The marker splits the text content into `leftChar` (spillover), `middleChar` (markdown syntax), and `rightChar` (spillover).
3. **Spillover Push (Give)**: The marker pushes non-markdown characters to neighboring text nodes.
4. **Tag Swap**: If `middleChar` changed, we resolve the new class and project it onto `<semantic-tag>`.
5. **End Caret Cascade**: The parent updates the `<semantic-end-marker>` text dynamically to match the expected closing pair.

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

### 2. Explicit Markdown Source (`textContent` Invariant)
- **The Rule**: The editor's `textContent` (either natively or through a simple layout-free transformation) MUST always return the valid, legit desired Markdown source. We NEVER use `innerText` in the codebase.
- **Constraint**: No "phantom" nodes or hidden metadata text that doesn't exist in the Markdown may pollute the text stream.
- **The Invariant Rules**:
    1. **Strict Rule**: The raw `editorNode.textContent` at any given moment yields the exact, valid, desired Markdown.
    2. **Weaker Rule**: Upon request/serialization, `textContent` through a fast, layout-independent DOM-traversal transformation (e.g. `Array.from(editor.childNodes).map(n => n.textContent).join('\n')`) yields the legit desired Markdown.

### 3. DOM Encapsulation (Exclusive Ownership)
- **The Rule**: `DomServicer` is the **exclusive** owner of all DOM mutations.
- **Constraint**: No other class or service (e.g., `EditorOrchestrator`, `MarkdownParser`) may call native DOM methods that modify the structure (like `replaceWith`, `appendChild`, `remove`, `innerHTML`, etc.).
- **Implementation**: All structural changes must go through the `DomServicerFace` contract (`swapNodes`, `replaceNode`, `removeNode`).

### 4. Logging & Diagnostics (Dev Console Instrumentation)
- **The Rule**: Always instrument key orchestrator flows and event handlers with explicit, readable `console.debug` statements.
- **Why**: Allows both developers and AI agents to transparently trace exactly what triggers, what gets matched, and what is skipped during editing.
- **Constraint**: All dev instrumentation logs should be removed or cleaned up in close-up routines before shipping to production.

## Naming and Implementation Philosophy (Go-Style)

- **Interfaces are Agent Faces**: We use the `Face` suffix for interfaces to signify they are the contract/interface of an agent.
    - Example: `DomServicerFace` is the interface, `DomServicer` is the doer.
- **Types are Attributes**: Use the `type` keyword for data structures, event payloads, and constants.
- **Readability**: Method names must read like English sentences when called.
    - Example: `domServicer.swapNodes(node, newTag)` is preferred over `domServicer.execute(node, tag)`.

## Unpopular Technical Decisions & Rationale

### 1. Zero Custom Caret Navigation (Trusting Browser Native Editing)
* **Decision:** We do absolutely nothing to intercept or manage caret/cursor movement. We completely reject custom keyboard event routers for editing operations.
* **Rationale:** Writing custom caret manipulation logic in `contenteditable` is a notorious source of cross-browser rendering bugs and lag. By leaving editing entirely to native browser defaults, we gain 100% platform-native responsiveness and stability for free. We only intervene during boundary-formatting validations.

### 2. ClassName as the Core Structural SOT, Start-Marker as Syntax Descriptor
* **Decision:** The parent `<semantic-tag>`'s `className` is the absolute Source of Truth for the element's structural type (e.g. `pre`, `h1`, `b`). The `<semantic-marker>` is the syntax descriptor that contains detailed markdown decoration and metadata.
* **Rationale:** This establishes a clean separation of concerns. The container is the structural unit, allowing fast O(1) type checks. The marker handles raw keyboard inputs and holds auxiliary metadata (like code block language signatures, e.g. ```` ```js ````) which can be queried on demand. When a marker is permanently deleted, we cleanly re-assign the structural SOT (`className = 'p'`) without destructive tag-unwrapping.

### 3. Progressive Promotion via `moveBefore`
* **Decision:** We bypass standard `replaceWith(...this.childNodes)` during tag unwraps in favor of the newer `moveBefore()` API.
* **Rationale:** Standard DOM transfers trigger a flurry of `disconnectedCallback` cycles, which can cause recursive unwraps during complex browser line splits (like Enter key splits). Utilizing `moveBefore()` transfers caret boundary elements and child nodes atomically without unmounting them, silencing redundant lifecycles and preventing stack crashes natively.

## PubSub

We use an explicit **PubSub** mechanism to manage event-driven reactivity, specifically for the lifecycle of Markdown markers (`md-ctrl`). This ensures that reactive changes are declarative and visible.

### Child-Parent Communication Rule (No PubSub for Local Direct Bounds)
* **Direct Function Calls Preferment**: For communication between an immediate child and parent component (e.g., `<semantic-marker>` and `<semantic-tag>`), **always use direct function calls on each other** instead of subscribing to a PubSub topic or dispatching DOM events. This ensures 100% type safety, maximum performance, instant synchronous updates, and completely eliminates any memory leak risks or closure leaks!

### Event-Driven Logic
While much of the system's structure is governed by direct service orchestration, PubSub handles the "active" part of the editor:
- **Marker Mutations**: When an `md-ctrl` element is modified, it publishes to the `markerChanged` topic.
- **Reactive Actions**: The `EditorOrchestrator` subscribes to these topics to perform surgical updates, such as syncing paired markers or swapping block tags.

### Memory Leaks & "Silent Zombies"
Using a global Topic (like `husk/ui/pubsub.ts`) comes with a strict memory management responsibility. When a dynamic component (like a DOM node) passes an arrow function to a Topic's subscriber list, it creates a **closure**. This closure holds a strong reference to the component instance.

**The Danger:** If the component is deleted from the DOM, the Garbage Collector **cannot** delete it from memory because the global Topic still holds a reference to the subscriber function. The dead component becomes a "Silent Zombie", executing its subscriber function off-screen every time the Topic publishes, creating severe memory leaks.

**The Solutions:**
1. **Manual Cleanup:** Store the `keys` returned by `Topic.bus()` or `Topic.sub()`, and explicitly call `Topic.unsub(key)` when the component is destroyed (e.g., inside `disconnectedCallback`).
2. **Automatic Crash (Preferred for UI):** Ensure the subscriber function intentionally throws an error if it detects it is disconnected: `if (!this.isConnected) throw new Error("Zombie");`. The `try/catch` block in `husk/ui/pubsub.ts` will catch this crash and cleanly delete the subscriber from the Map, freeing the Garbage Collector.

### Behavioral Traceability
Structural graphs (imports) only tell half the story. To maintain architectural integrity, we use the **Husk Logic-Graph** utility to visualize real-time behavior.

- **Logical Flow**: We prioritize the `Publisher -> Topic -> Subscriber` flow over internal wiring.
- **Interactive Truth**: The generated `reports/logic-graph.dot` includes interactive `URL` and `tooltip` attributes, allowing developers to jump directly from a node in the graph to the corresponding source file.
- **Noise Suppression**: Orchestration logic (like `pubsub-flow.ts` or `main`) is suppressed to keep the graph focused on pure business logic interactions between services and Browser APIs.
- **Invariant Enforcement**: Any direct cross-service coupling that appears in the graph without an event-driven justification is a candidate for refactoring in Iteration 6.

This graph serves as our **Architectural Truth**, allowing us to verify that logic flows correctly and that invariants (such as direct DOM manipulation outside of `DomServicer`) are strictly avoided.

## Additional Engineering Principles

### 1. Fail-Fast / Trust the Happy Path (Zero Defensive Coding & Prediction)
We strictly avoid defensive programming that "silences" structural errors. If an element's invariant is broken (e.g., a required marker span is unexpectedly deleted), we do **not** use early returns or optional chaining (e.g., `if (!element) return;`) to hide the error under the carpet. We never predict or anticipate hypothetical conditions.

We trust the happy path and allow the application to throw a loud exception (e.g., `TypeError: Cannot read properties of null`). This "fail-fast" principle ensures that impossible-to-debug zombie states never exist in production, forcing us to correctly address the root structural bugs immediately during development.

> [!WARNING]
> **The Red Flag Rule:** Every single `if` check, fallback branch, or error handling blocks catching or treating `null`, `undefined`, `empty`, or hardcoded value boundaries (like `p`, etc.) is considered an architectural **Red Flag**. Such blocks must be discussed very carefully before creation. The necessity for these defensive checks is a symptom of a larger architectural mistake, which requires us to review the entire codebase instead of patching it locally.

### 2. On-Demand Building
Not every small code change requires a full end-to-end test or build. Do not run the global build command (`deno task dev:build`) reflexively after minor updates. Trust the code changes, and only run full builds when a significant milestone is reached or when explicitly requested.

### 3. Interactive Review vs. Session Close-Up (CRITICAL PROCESS RULE)
* **The Rule**: Do NOT run git commits, pushes, or Deno build commands after every single minor iteration or code change. 
* **Git & Build Permission Policy**: 
  - **Git Commits & Pushes:** NEVER run git commits or pushes unless the USER explicitly requests them.
  - **Deno Builds:** NEVER run compile/build commands unless the USER explicitly requests them.
  - **Permission-Free Actions:** Reading/writing files locally in current repos, running `git status`, and running `git pull` do **NOT** require any user permission and should be done proactively as needed.
* **Why**: It typically takes many cycles of "review and redo" to refine a feature to perfection. Doing build/commit chores prematurely is highly inefficient. We are using dev server for (husk) during dev, no need for build untill on-request.
* **Protocol**: 
  1. During active review, just edit the source files and let the developer do the direct checking.
  2. Perform **ONLY ONE "close-up" phase** (build, git check, documentation/task-tracker updates) at the very end of the session, once both the AI and the developer explicitly agree the work is fully complete.

### 4. Strict Refactoring Definition
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

### 4. Dual-Mode Initialization Pattern (Lit-like Attribute/Constructor Synergy)
For consistency, all Web Components must support both JavaScript instantiation (`new Component(args)`) and HTML parsing (`<my-component attr="val">`) flawlessly:
- **Constructor Defaults**: Always define the constructor with "zero value" defaults (e.g., `constructor(marker: string = "", isStart = true)`) that assign parameters to internal variables. This ensures the browser's native DOM parser can instantiate the element with zero arguments without throwing parameter errors.
- **`connectedCallback` Attribute Fallback**: In `connectedCallback()`, check if the instance variables are zero/empty. If they are, retrieve their values directly from the element's HTML attributes (e.g., `this.getAttribute('marker')`). This guarantees seamless setup whether the element is created programmatically or parsed directly from markup.

## Code Freeze & SOLID Modification Protocols

This section lists the top-level objects in our architecture, their responsibilities, and their current modification status. 

**Rule of Thumb:** We adhere strictly to the Open/Closed Principle. We do not modify existing core classes simply to "expand" functionality (e.g., adding a new syntax style). Core logic should only change if the underlying rules or architecture *must* change.

If a class is marked as **FROZEN**, no code changes may be made to it without explicit consultation and confirmation from the project lead.

### 0. `husk/` (Infrastructure & Utilities)
- **Status:** 🔴 **FROZEN**
- **Responsibility:** The core infrastructure, UI components, PubSub system, and logic-graph generator that powers the entire workspace.
- **Why it exists:** Provides robust, generic foundational tools and architectural visualization (e.g., `logic-graph.ts` and `pubsub.ts`) to support all sub-projects.
- **Modification Rule:** The entire directory is strictly frozen. No modifications are allowed to any file within `husk/` without explicit approval.

### 1. `SemanticTag` (`src/semantic-tag.ts`)
- **Status:** 🔴 **FROZEN**
- **Responsibility:** The autonomous Web Component that serves as a passive container, manages internal start/end markers via value-differ sync logic, and hosts the visual styling className.
- **Why it exists:** Provides a zero-overhead, highly encapsulated container for Markdown markup without any external event buses or state orchestrators.
- **Modification Rule:** Strictly frozen. Never modify this component without explicit consultation and confirmation from the project lead.

### 1b. `SemanticMarker` (`src/semantic-marker.ts`)
- **Status:** 🔴 **FROZEN**
- **Responsibility:** The generic, light element representing the visual Markdown marker syntax characters (e.g. `**`, `# `). It manages its own direct `MutationObserver` and notifies the parent container natively during typing and removal lifecycles.
- **Why it exists:** Isolates the active character editing of Markdown syntax, providing robust local reactivity that keeps the parent `<semantic-tag>` 100% clean and free of polling loops.
- **Modification Rule:** Strictly frozen. Never modify this component without explicit consultation and confirmation from the project lead.

### 2. `MarkdownParser` (`src/markdown-parser.ts`)
- **Status:** 🟡 **ACTIVE** (Refactoring for Iteration 7)
- **Responsibility:** Translates raw Markdown into `SemanticTag` instantiations.
- **Why it exists:** The editor needs a reliable, one-way translator to convert flat strings into our surgical, nested component tree.
- **Parser Library Decision:** We utilize **Marked** (`marked.lexer`) to generate a lightweight Abstract Syntax Tree (AST) from raw markdown. We evaluated several alternatives:
    - **Remark**: Too heavy. We don't need its exact character offset tracking anymore since we don't do complex cursor manipulation across node swaps.
    - **Lezer**: Too generic and steep learning curve for simple DOM mapping.
    - **Markdown-it**: Produces a flat array of tokens. Since we construct our DOM bottom-up, its requirement to use a state machine (stack) was less idiomatic than a nested tree.
    - **Marked**: Perfect fit. Provides a simple, nested AST via `.lexer()` that maps flawlessly to a bottom-up, recursive `SemanticTag` instantiation logic.
- **Modification Rule:** Output signature must return a DOM fragment/element containing `SemanticTag` nodes. The internal parsing uses Marked instead of custom Regex.

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

## AI Development & Communication Invariants

- **The Rule**: Antigravity/AI developers MUST skip compliments, praise, or introductory flattery in conversation. Interactions must remain strictly direct, technical, and objective.
- **Git & Build Permissions policy**: 
  - Git Commits & Pushes are **strictly restricted** and must ONLY be run when explicitly requested by the USER.
  - Compile / build commands are **strictly restricted** and must ONLY be run when explicitly requested by the USER.
  - File reading/writing locally, running `git status`, and `git pull` are **fully pre-approved** and do NOT require permission.
- **Pair Programming & Algorithms**: We care deeply about algorithms (how things are done under the hood). We discuss approaches thoroughly (using chat, diagrams, or iterative edits to the implementation plan) *before* writing code.
- **Pair Programming & Focus Protocol**: We like focus work. When in active pair programming mode, both participants must proceed with extreme focus and deliberate pacing. We limit edits to a tiny scope (often 1 or 2 files, and only a few targeted lines of code change at a time). We strictly address only the specific task at hand. There must be NO unsolicited refactoring, code formatting, style restructuring, or removal/alteration of existing code comments or documentation. We focus entirely on developing the barebones, happy-path algorithm, postponing all secondary polishing and refactoring until explicitly agreed upon.

## Development Philosophy: Always Happy Path

- **The Principle**: We code assuming the **Happy Path** by default. We do NOT add defensive checks or anticipate theoretical edge cases until we have a concrete runtime error in front of us.
- **No Verbose Skipped Logs**: Do not pollute the logging flow with "skipping", "null", "not in trigger", or "not found" messages. Logging (`console.debug`) should ONLY trace successful matches or positive actions. Keep the code clean, concise, and focused.

## Caret & Marker Lifecycle Invariant

- **The Rule**: In the editor, a user **never** types or manually inserts a closing marker. The only way closing markers exist in the DOM is via file loading/parsing.
- **Marker Instantiation**: When a user types an opening trigger character (e.g. `` ` ``), it immediately triggers the creation of a `<semantic-tag>`.
- **Self-Generating Markers**: The `<semantic-tag>`'s shadow/light DOM itself natively generates and manages both the start and end markers (e.g. using `tag.fill()`).
- **No Symmetrical Closing Match**: Consequently, the editor's runtime input orchestration logic only needs to look *forward* from the cursor (into `rightText`) to grab the targeted phrase and wrap it; the user never inputs a matching closing marker character.


## Next-Gen Marker & Block Splitting Guidelines

1. **Closing Marker Immutability:**
   Closing markers are strictly immutable. They are automatically created, synced, and updated by the parent tag structure, never directly modified or typed by the user.

2. **Boundary Neighbor Tracking (markersWithBorders):**
   Semantic markers will dynamically inspect and track their neighboring boundary characters to ensure clean transition states and prevent accidental syntax leakage.

3. **Fallback Structuring on Invalid Markers:**
   If an opening marker becomes invalid (e.g. missing its space rule or syntax character), the element retains its exact structural DOM container but removes all visual CSS styling. Under these conditions, the partner closing marker should be set to hidden (`display: none`) to keep the editor clean and clear.





