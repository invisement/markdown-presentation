# Markdown Presenter

A zero-install, Deno-powered markdown viewer for reading, presenting, and printing. Works as a single HTML file or a modular web application.

## Quick Start (Development)

1. **Install Deno**: [deno.land](https://deno.land/)
2. **Run Dev Server**:
   ```bash
   deno task dev
   ```
3. Open [http://localhost:8000](http://localhost:8000)
4. Click **Open Folder** and pick the folder containing your `.md` files.

## Features

- **Modular ESM**: No heavy bundling for development; uses browser-native Import Maps.
- **Deno Powered**: Built-in transpilation, file watching, and local server.
- **Three Modes**: Screen (reading), Present (fullscreen slides), and Print (16:9 PDF).
- **Diagrams**: Native support for **Mermaid** and **Graphviz (DOT)** via `@hpcc-js/wasm`.
- **Relative Assets**: Resolves images via File System Access API.
- **Persistence**: Per-document settings saved in IndexedDB.
- **Single-File Export**: Build a fully self-contained HTML for offline use.

## Project Structure

```text
├── ui/                 # Frontend assets (TS, CSS, MD)
│   ├── index.html      # Main entry point
│   ├── index.ts        # UI Logic
│   ├── index.css       # Design System
│   └── user-guide.md   # Built-in documentation
├── husk/               # Local Deno framework (Husk)
│   ├── mod.ts          # Husk core
│   └── utils/          # Build and transpile utilities
├── server.ts           # Deno dev server
└── deno.json           # Deno configuration and Import Maps
```

## Deno Tasks

- `deno task dev`: Starts the dev server with HMR-like UI transpilation.
- `deno task build`: Transpiles the UI for production deployment.
- `deno task standalone`: Bundles everything into `dist/markdown-presenter.html`.

## Writing Slides

- `# H1`: Title slide (centered)
- `## H2`: New slide / page break
- `### H3`: Sub-section (optional page break)
- `---`: Force page/column break

## Distribution

### Webapp (Prod)
Deploy the `ui-dist/` folder to any static host or use Deno Deploy.

### Standalone
Run `deno task standalone` to produce a single ~5MB file that works entirely offline.

## Requirements

- **Deno 1.40+**
- **Modern Browser**: Chrome or Edge (for File System Access API)

## License
MIT
