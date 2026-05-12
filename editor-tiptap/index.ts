import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

export class TiptapEditor {
  private editor: Editor;

  constructor(element: HTMLElement, initialContent: string = '', onChange?: (markdown: string) => void) {
    this.editor = new Editor({
      element: element,
      extensions: [
        StarterKit,
        Markdown.configure({
          html: false,
          tightLists: true,
          tightListNodes: true,
        }),
      ],
      content: initialContent,
      onUpdate: ({ editor }) => {
        const markdown = editor.storage.markdown.getMarkdown();
        if (onChange) {
          onChange(markdown);
        }
        // Also dispatch a DOM event for flexibility
        element.dispatchEvent(new CustomEvent('editor-change', { 
          detail: { markdown },
          bubbles: true 
        }));
      },
    });
  }

  public getMarkdown(): string {
    return this.editor.storage.markdown.getMarkdown();
  }

  public setMarkdown(content: string) {
    this.editor.commands.setContent(content);
  }

  public focus() {
    this.editor.focus();
  }

  public destroy() {
    this.editor.destroy();
  }
}
