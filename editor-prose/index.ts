import { EditorState, Plugin } from "prosemirror-state";
import { EditorView, Decoration, DecorationSet } from "prosemirror-view";
import { Schema, DOMParser } from "prosemirror-model";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";

// 1. Semantic Schema
// We define real nodes for headers and lists, but their content will include the markers.
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      content: "inline*",
      group: "block",
      toDOM() { return ["p", 0]; }
    },
    heading: {
      attrs: { level: { default: 1 } },
      content: "inline*",
      group: "block",
      defining: true,
      toDOM(node) { return ["h" + node.attrs.level, 0]; }
    },
    bullet_list: {
      content: "list_item+",
      group: "block",
      toDOM() { return ["ul", 0]; }
    },
    list_item: {
      content: "paragraph",
      toDOM() { return ["li", 0]; }
    },
    text: { group: "inline" }
  },
  marks: {
    strong: { toDOM() { return ["strong", 0]; } },
    em: { toDOM() { return ["em", 0]; } },
    code: { toDOM() { return ["code", 0]; } }
  }
});

// 2. Syntax Wrapper Logic (The <md-char> provider)
function syntaxHighlight(doc: any) {
  const decorations: any[] = [];
  
  doc.descendants((node: any, pos: number) => {
    const text = node.textContent;
    if (!text) return;

    // A. Header Markers: #, ##, etc.
    const headerMatch = text.match(/^(#{1,6})\s+/);
    if (headerMatch && node.type.name === "heading") {
      decorations.push(Decoration.inline(pos + 1, pos + 1 + headerMatch[1].length, { nodeName: "md-char" }));
    }

    // B. List Markers: - 
    const listMatch = text.match(/^([-*+])\s+/);
    if (listMatch && node.type.name === "paragraph" && node.parent?.type.name === "list_item") {
      decorations.push(Decoration.inline(pos + 1, pos + 1 + listMatch[1].length, { nodeName: "md-char" }));
    }

    // C. Mark Markers: **, *, `
    node.marks.forEach((mark: any) => {
      // Bold **
      if (mark.type.name === "strong") {
        decorations.push(Decoration.inline(pos + 1, pos + 3, { nodeName: "md-char" }));
        decorations.push(Decoration.inline(pos + node.nodeSize - 2, pos + node.nodeSize, { nodeName: "md-char" }));
      }
      // Italic *
      if (mark.type.name === "em") {
        decorations.push(Decoration.inline(pos + 1, pos + 2, { nodeName: "md-char" }));
        decorations.push(Decoration.inline(pos + node.nodeSize - 1, pos + node.nodeSize, { nodeName: "md-char" }));
      }
      // Code `
      if (mark.type.name === "code") {
        decorations.push(Decoration.inline(pos + 1, pos + 2, { nodeName: "md-char" }));
        decorations.push(Decoration.inline(pos + node.nodeSize - 1, pos + node.nodeSize, { nodeName: "md-char" }));
      }
    });
  });

  return DecorationSet.create(doc, decorations);
}

async function initEditor() {
  const editorElement = document.querySelector("#editor");
  if (!editorElement) return;

  // 3. Initial Load & Parser
  let initialMarkdown = "# Hello\nThis is **bold** text.";
  try {
    const response = await fetch("initial-markdown-content-test.md");
    if (response.ok) initialMarkdown = await response.text();
  } catch (e) { console.error(e); }

  // Simple manual parser to create the initial semantic tree
  const lines = initialMarkdown.split("\n");
  const nodes = lines.map(line => {
    // Header check
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      return schema.node("heading", { level: hMatch[1].length }, [schema.text(line)]);
    }
    // List check
    const lMatch = line.match(/^([-*+])\s+(.*)$/);
    if (lMatch) {
      return schema.node("bullet_list", null, [
        schema.node("list_item", null, [
          schema.node("paragraph", null, [schema.text(line)])
        ])
      ]);
    }
    // TODO: More complex mark parsing for initial load could go here
    // For now, let's keep it simple as text inside paragraphs
    return schema.node("paragraph", null, line ? [schema.text(line)] : []);
  });

  const state = EditorState.create({
    schema,
    doc: schema.node("doc", null, nodes),
    plugins: [
      keymap(baseKeymap),
      new Plugin({
        props: {
          decorations(state) { return syntaxHighlight(state.doc); }
        }
      })
    ]
  });

  new EditorView(editorElement, { state });
  console.log("Semantic Explicit Editor Ready");
}

initEditor();
