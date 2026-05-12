# Editor Markdown

This is a decoupled Markdown editor component for the Markdown Presentation project. It wraps `EasyMDE` and provides a standardized `MarkdownEditor` interface.

## Usage

```typescript
import { MarkdownEditor } from "./mod.ts";

const editor = new MarkdownEditor(document.getElementById("editor"));
editor.onSave((content) => {
  console.log("Saved content:", content);
});
```

## Features

- Decoupled from the main UI logic.
- Standardized interface for easier editor swapping in the future.
- Integrated with Deno tasks for development.
