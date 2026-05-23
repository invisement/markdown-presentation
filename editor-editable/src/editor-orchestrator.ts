import { MarkdownParserFace } from './markdown-parser.ts';
import { SemanticTag } from './semantic-tag.ts';
import { SemanticRules } from './semantic-rules.ts';

/**
 * Contract for the Editor Orchestrator.
 * Responsibility: Wires publishers to surgical actions.
 */
export interface EditorOrchestratorFace {
    handleInput(e: InputEvent): void;
    loadSample(): Promise<void>;
}

/**
 * EditorOrchestrator — The "Brain" that coordinates actions based on topics.
 */
export class EditorOrchestrator implements EditorOrchestratorFace {
    constructor(
        private parser: MarkdownParserFace,
        private editorEl: HTMLElement
    ) { }

    public async loadSample() {
        const resp = await fetch('input/sample.md');
        const markdown = (await resp.text()).trimEnd();
        this.editorEl.replaceChildren(this.parser.parse(markdown));
    }

    public handleInput(e: InputEvent) {
        console.debug('[Orchestrator] handleInput e.data =', e.data);

        if (!e.data || !SemanticRules.isMarker(e.data)) {
            console.debug('[Orchestrator] Not in trigger keys, we do nothing, skipping');
            return;
        }

        const sel = window.getSelection()!;
        const offset = sel.anchorOffset;
        const node = sel.anchorNode;

        // do not triger when typing inside markers. (we have listeners on these web components)
        if (node?.parentElement?.classList.contains('marker')) return;

        const text = node!.textContent!;
        console.debug('[Orchestrator] textContent =', text, 'offset =', offset);

        const left = text.substring(0, offset - 1);
        const right = text.substring(offset);

        const semanticTag = new SemanticTag().fill(e.data);
        console.debug("empty semantic tag created", semanticTag);

        // replace current parent with left, semanticTag, right
        const parent = node!.parentElement!;
        parent.replaceWith(left, semanticTag, right);
    }
}

import { MarkdownParser } from './markdown-parser.ts';
import { setupFlow } from './pubsub-flow.ts';

/**
 * Main Entry Point (The Bootstrap)
 */
function main() {
    const editorEl = document.getElementById('editor');
    if (!editorEl) return;

    const parser = new MarkdownParser();
    const orch = new EditorOrchestrator(parser, editorEl);

    // CENTRAL WIRING
    setupFlow(orch, editorEl);

    // LOAD INITIAL STATE
    orch.loadSample();
}

main();
