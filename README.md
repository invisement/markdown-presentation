# Markdown Presenter

A professional, Deno-powered markdown viewer for reading, presenting, and printing. Built on the "Smart Lazy" architecture for an instant-feedback development experience.

## Quick Start (Development)

1.  **Install Deno 2.7+**: [deno.com](https://deno.com/)
2.  **Run Dev Server**:
    ```bash
    deno task dev
    ```
3.  Open [http://localhost:8000](http://localhost:8000)
4.  Click **Open Folder** and pick the folder containing your `.md` files.

## Features

-   **Smart Lazy Architecture**: ZERO background CPU usage. UI rebuilds occur **incrementally** and **on-demand** only when you refresh your browser.
-   **Native Deno 2**: Leverages native Node compatibility and JSR standard libraries.
-   **Three Modes**: Screen (reading), Present (fullscreen slides), and Print (16:9 PDF).
-   **Diagrams**: Native support for **Mermaid** and **Graphviz (DOT)** via `@hpcc-js/wasm`.
-   **Relative Assets**: Resolves images via File System Access API.
-   **Single-File Export**: Build a fully self-contained HTML for offline use.

## Project Structure

```text
├── ui/                 # Frontend source (TS, CSS, MD)
├── husk/               # Core Framework (Local Submodule)
├── editor-easymde/     # Markdown Editor (Local Submodule)
├── ui-dist/            # Incremental Build Output (Git Ignored)
├── server.ts           # Deno Entry Point
└── deno.json           # Project configuration & JSR Imports
```

## Deno Tasks

-   `deno task dev`: Starts the dev server with smart UI tracking enabled.
-   `deno task build`: Perfroms a full incremental build of the UI.
-   `deno task standalone`: Bundles everything into a single-file offline HTML.

## Development (Husk Framework)

This project uses **Husk v0.7.0**, a framework built for modern Deno.

### On-Demand Rebuilds
In dev mode, you don't need to restart the server or wait for background watchers. Simply **refresh your browser**. Husk will detect source changes, re-transpile only what is necessary, and serve the updated files in milliseconds.

## Requirements

-   **Deno 2.7+**
-   **Modern Browser**: Chrome or Edge (for File System Access API)

## License
MIT
