import { DomServicerFace, MdNodeTag } from './dom-servicer.ts';
import { MarkdownParserFace, Schema } from './markdown-parser.ts';

/**
 * Contract for the Editor Orchestrator.
 * Responsibility: Wires publishers to surgical actions.
 */
export interface EditorOrchestratorFace {
    handleBlockInput(block: HTMLElement): void;
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
    ) {}

    public handleBlockInput(block: HTMLElement) {
        const text = block.innerText;
        const m = text.match(Schema.BLOCK_HEADER);
        let targetTag = 'P';
        if (m) targetTag = 'H' + m[1].length;
        else if (Schema.BLOCK_LIST.test(text)) targetTag = 'LI';
        else if (Schema.BLOCK_CODE.test(text)) targetTag = 'PRE';

        if (targetTag !== block.tagName) {
            const next = (targetTag === 'PRE' || block.tagName === 'PRE') 
                ? this.parser.parseDocument(text) 
                : this.parser.parseBlock(text);
            this.dom.replaceNode(block, next);
        }
    }

    public async loadSample() {
        const resp = await fetch('input/sample.md');
        const markdown = (await resp.text()).trimEnd();
        this.dom.clearAndAppend(this.editorEl, this.parser.parseDocument(markdown));
    }
}

import { DomServicer } from './dom-servicer.ts';
import { MarkdownParser } from './markdown-parser.ts';
import { setupFlow } from './pubsub.ts';

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
