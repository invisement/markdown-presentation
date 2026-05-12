# Tiptap Editor Specification

## Technical Stack
- **Framework**: Tiptap v2 (ProseMirror-based).
- **Runtime**: Deno (Server-side), Browser-native (Client-side).
- **Dependencies**: 
  - `@tiptap/core`
  - `@tiptap/starter-kit`
  - `@tiptap/extension-markdown` (or `tiptap-markdown` for MD support).
- **Module Resolution**: JSDelivr ESM CDN.

## Architecture
- **`mod.ts`**: Entry point for the editor component.
- **`index.ts`**: Core logic for initializing and managing the editor state.
- **`index.css`**: Premium styling, glassmorphism, and modern typography.
- **`index.html`**: Dev-only wrapper for testing.

## Features (Phase 1)
1. **Initialization**: Create an editor instance on a target DOM element.
2. **Markdown Sync**: Method to get/set Markdown content.
3. **Menu Bar**: Floating or fixed toolbar with essential formatting.
4. **Theme**: Dark mode by default with high-contrast accents.

## Data Flow
1. Parent app passes Markdown string to `Editor.setContent(md)`.
2. Editor converts MD to ProseMirror Document.
3. On update, Editor emits `contentUpdate` event with current Markdown.
