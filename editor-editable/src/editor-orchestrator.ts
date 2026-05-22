import { DomServicerFace } from './dom-servicer.ts';
import { MarkdownParserFace, Schema } from './markdown-parser.ts';
import { SemanticTag } from './semantic-tag.ts';

/**
 * Contract for the Editor Orchestrator.
 * Responsibility: Wires publishers to surgical actions.
 */
export interface EditorOrchestratorFace {
    handleBlockInput(block: HTMLElement): void;
    handleInput(e: InputEvent): void;
    loadSample(): Promise<void>;
}

/**
 * EditorOrchestrator — The "Brain" that coordinates actions based on topics.
 */
export class EditorOrchestrator implements EditorOrchestratorFace {
    constructor(
        private dom: DomServicerFace,
        private parser: MarkdownParserFace,
        private editorEl: HTMLElement
    ) { }

    public handleBlockInput(block: HTMLElement) {
        const text = block.innerText;
        const next = this.parser.parse(text);
        this.dom.replaceNode(block, next);
    }

    public async loadSample() {
        const resp = await fetch('input/sample.md');
        const markdown = (await resp.text()).trimEnd();
        this.dom.clearAndAppend(this.editorEl, this.parser.parse(markdown));
    }

    public handleInput(e: InputEvent) {
        console.debug('[Orchestrator] handleInput e.data =', e.data);
        const triggers = ['*', '`', '~', '_', '#', '-'];

        if (e.inputType === "insertParagraph") {
            // e.preventDefault();
            // const sel = window.getSelection()!;
            // const activeTag = sel.anchorNode!.parentElement!.closest('semantic-tag') as SemanticTag;
            // activeTag.split2(sel.anchorNode!, sel.anchorOffset);
            // console.debug("splited", activeTag)
            console.log("skipped")
            return;
        }

        if (!e.data || !triggers.includes(e.data)) {
            console.debug('[Orchestrator] Not in trigger keys, we do nothing, skipping');
            return;
        }

        // break text into left and right at offset and insert a semantic-tag
        const sel = window.getSelection()!;
        const text = sel.anchorNode!.textContent!;
        const offset = sel.anchorOffset;
        console.debug('[Orchestrator] textContent =', text, 'offset =', offset);

        const left = text.substring(0, offset - 1);
        const right = text.substring(offset);


        const semanticTag = new SemanticTag().fill(e.data)
        console.debug("empty semantic tag created", semanticTag)

        // replace current parent with left, semanticTag, right
        const parent = sel.anchorNode!.parentElement!;
        parent.replaceWith(left, semanticTag, right)
    }
}

import { DomServicer } from './dom-servicer.ts';
import { MarkdownParser } from './markdown-parser.ts';
import { setupFlow } from './pubsub-flow.ts';

/**
 * Main Entry Point (The Bootstrap)
 */
function main() {
    const editorEl = document.getElementById('editor');
    if (!editorEl) return;

    const dom = new DomServicer();
    const parser = new MarkdownParser(dom);
    const orch = new EditorOrchestrator(dom, parser, editorEl);

    // CENTRAL WIRING
    setupFlow(dom, orch, editorEl);

    // LOAD INITIAL STATE
    orch.loadSample();
}

main();
