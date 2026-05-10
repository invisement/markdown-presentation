import EasyMDE from 'easymde';

// Load CodeMirror modes natively into the bundle for syntax highlighting in the editor
import 'https://esm.sh/codemirror@5/mode/javascript/javascript.js';
import 'https://esm.sh/codemirror@5/mode/css/css.js';
import 'https://esm.sh/codemirror@5/mode/python/python.js';
import 'https://esm.sh/codemirror@5/mode/xml/xml.js';
import 'https://esm.sh/codemirror@5/mode/htmlmixed/htmlmixed.js';
import 'https://esm.sh/codemirror@5/mode/shell/shell.js';

export interface EditorOptions {
    onChange: (value: string) => void;
    onSave: () => void;
}

export class MarkdownEditor {
    private easyMDE: EasyMDE | null = null;

    init(element: HTMLElement, options: EditorOptions) {
        if (this.easyMDE) return;

        this.easyMDE = new EasyMDE({
            element: element as HTMLTextAreaElement,
            spellChecker: false,
            autofocus: true,
            status: false,
            toolbar: [
                "bold", "italic", "heading", "|", 
                "quote", "unordered-list", "ordered-list", "|", 
                "link", "image", "table", "|", 
                "guide"
            ],
            renderingConfig: {
                markedOptions: { sanitize: false }
            }
        });

        this.easyMDE.codemirror.on("change", () => {
            options.onChange(this.easyMDE!.value());
        });

        // Add custom Cmd+S / Ctrl+S to save the file
        this.easyMDE.codemirror.setOption("extraKeys", {
            "Cmd-S": () => options.onSave(),
            "Ctrl-S": () => options.onSave()
        });
    }

    getValue(): string {
        return this.easyMDE ? this.easyMDE.value() : "";
    }

    setValue(value: string) {
        if (this.easyMDE) {
            this.easyMDE.value(value);
        }
    }

    refresh() {
        if (this.easyMDE) {
            this.easyMDE.codemirror.refresh();
        }
    }
}

export default MarkdownEditor;
