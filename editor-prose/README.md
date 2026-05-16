# editor-prose
Markdown editor that is a text editor (text and code and markers visible) but looks a bit like markdown viewer with different colors and line fonts and styles.

Text editors are good because they are "explicit". they are fast to write, rule-based coloring/styling of words with specific semantic meaning. 
Markdown editors, like wysiwyg, are good because it is easy to read and present. bad: user spends time to style the doc. more importantly, it is clumsy to write in "word" editors.

We and LLMs need a way to communicate. Markdown is the obvious choice. Easy for LLM, Easy for humans. It is open format and very portable.


the editor must satisfy the avove defintiton: explicit, styled, fluent to write and pleasant to read and know what it would look like when it is rendered.
- explicit: similar to code editor that shows all codes and characters (markdown strustural chars or custom html tags or codes). 
- styled: applies custom css to output html
- code blocks will highlighted by a generic syntax highlighter.
- light and simple:  

> This is a new project, no need to have any other session luggage or remember any of previous sessions. .


## Development
This project is part of a Deno 2 workspace. To develop locally:
1. Ensure `deno` is installed.
2. Run `deno task dev` from the project root.
3. Open `http://localhost:8000/editor-prose/index.html` (once created).

## build
We are using Deno 2+ with proseMirror. 
- we decided to use npm: through Deno 2+ for prose (best for official support and singleton safety).
- we use explicit core primitives (state, view, model) instead of all-in-one setups to maintain a truly "explicit" and lightweight editor.


## Features
- [ ] Real, editable markdown markers.
- [ ] Robust list and code block support.
- [ ] it is text editor: it contains texts, control chars (#, *, -, `, ```, etc), and html tags.
- [ ] it should be able to apply different style to "code block: generic simple highlighter", html tags inside markdown: "monospace, yellow", markdown semantic characters: "grey, small, font-family-mono", and markdown/text: usual markdown styles.


## Browser use:
It is restricted! After every major update to ui, open `http://localhost:8000/editor-prose/index.html` in browser and read the browsers console logs. Close the browser. If there are any errors, fix them. and re open it again. and repeat until there are no errors or you decided errors are not important or need my help.

you do not need to use any other thing from browser including browsing other websites or taking screenshots or etc. Just read console logs.




## Some answers to potential questions
- we are not using tiptap. Only major libs are proseMirror alongside Deno2+ (typescript, esm packaging, browser importmap, jsr, etc). Following Deno 2+ standards and best practices is a must. 



## build
We are using Deno 2+ with proseMirror. 
- we decided to use npm: through Deno 2+ for prose (best for official support and singleton safety).
- we use explicit core primitives (state, view, model) instead of all-in-one setups to maintain a truly "explicit" and lightweight editor.


## Iterations and milestones
[X] **Iteration 1: Base Setup** - Workspace configuration and a "Hello World" ProseMirror instance. 



[X] **Iteration 2: Basic Styling** - Create `editor-content.css` (headers blue, code grey bg, ~10 lines) make our editor apply this to editor content.

[ ] **Iteration 3: Explicit Markers** - markers (*, #, etc) are visible, editable, and our style is applied..

[ ] **Iteration 5: HTML Tag Highlighting** - Simple monospace/yellow styling for inline <tags>.

[ ] **Iteration 6: Lists & Breaks** - Adding support for bullet lists and line breaks.

[ ] **Iteration 7: Code Blocks** - Simple grey background blocks for multi-line code.
8. **Iteration 8: Browser Validation** - Final console log check and E2E verification.

every iteration, mean planning, agreeing on main decisions, implementing, opening browser and checcking logs and fixing, me doing visual and end to end test. 
Iteration inlvolves confirming, updating docs, etc. then asking to move to the next iteration. check this readme and spec to update them to reflect our latest decisions and direction.


## Tests and veritications
- [ ] editorElement.innerText should always return our standard markdown content back.
