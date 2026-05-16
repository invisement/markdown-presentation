import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, DOMParser, DOMSerializer } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { exampleSetup } from "prosemirror-example-setup";
import { MarkdownParser, MarkdownSerializer, defaultMarkdownSerializer } from "prosemirror-markdown";
import markdownit from "https://esm.sh/markdown-it@14.1.0";

// 1. Define a Schema that supports our Structural Markers
const schema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
  marks: basicSchema.spec.marks
});

// 2. CUSTOM MAPPING: This is the "One Step Back" logic
// We tell the parser to keep the markers as actual text
const md = markdownit({ html: true });
const customParser = new MarkdownParser(schema, md, {
  blockquote: { block: "blockquote" },
  paragraph: { block: "paragraph" },
  list_item: { block: "list_item" },
  bullet_list: { block: "bullet_list" },
  ordered_list: { block: "ordered_list", getAttrs: tok => ({ order: +tok.attrGet("start") || 1 }) },
  heading: { block: "heading", getAttrs: tok => ({ level: +tok.tag.slice(1) }) },
  code_block: { block: "code_block", noCloseToken: true },
  fence: { block: "code_block", getAttrs: tok => ({ params: tok.info || "" }), noCloseToken: true },
  hr: { node: "horizontal_rule" },
  image: { node: "image", getAttrs: tok => ({
    src: tok.attrGet("src"),
    title: tok.attrGet("title"),
    alt: tok.children[0] && tok.children[0].content
  }) },
  hardbreak: { node: "hard_break" },

  // INLINE MAPPING: This is where we insert the markers
  em: { mark: "em" }, // We could also insert * here
  strong: { mark: "strong" }, // We could also insert ** here
  code_inline: { mark: "code" }
});

// 3. The Visual Mapping Plugin (Styles the markers as muted)
import { Decoration, DecorationSet } from "prosemirror-view";
const markerPlugin = (state: EditorState) => {
  const decos: Decoration[] = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const text = node.text || "";
    const markerRegex = /(\*\*|[*`#]|>\s+)/g;
    let match;
    while ((match = markerRegex.exec(text)) !== null) {
      decos.push(Decoration.inline(pos + match.index, pos + match.index + match[0].length, { class: "style-char" }));
    }
  });
  return DecorationSet.create(state.doc, decos);
};

export class TiptapEditor {
  private view: EditorView;

  constructor(element: HTMLElement, initialContent: string = '', onChange?: (markdown: string) => void) {
    const state = EditorState.create({
      doc: customParser.parse(initialContent),
      plugins: [
        ...exampleSetup({ schema, menuBar: false }),
        {
          props: {
            decorations: markerPlugin
          }
        }
      ]
    });

    this.view = new EditorView(element, {
      state,
      dispatchTransaction: (tr) => {
        const newState = this.view.state.apply(tr);
        this.view.updateState(newState);
        
        if (tr.docChanged && onChange) {
          onChange(this.getMarkdown());
        }
        
        element.dispatchEvent(new CustomEvent('editor-change', { 
          detail: { markdown: this.getMarkdown() },
          bubbles: true 
        }));
      }
    });
  }

  public getHTML(): string {
    const div = document.createElement("div");
    div.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(this.view.state.doc.content));
    return div.innerHTML;
  }

  public getMarkdown(): string {
    return defaultMarkdownSerializer.serialize(this.view.state.doc);
  }

  public setMarkdown(content: string) {
    const state = EditorState.create({
      doc: customParser.parse(content),
      plugins: this.view.state.plugins
    });
    this.view.updateState(state);
  }

  public focus() {
    this.view.focus();
  }

  public destroy() {
    this.view.destroy();
  }
}
