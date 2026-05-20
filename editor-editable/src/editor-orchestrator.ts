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
        console.debug('[Orchestrator] handleInput e.data =', JSON.stringify(e.data));
        const triggers = ['*', '`', '~', '_', '#', '-'];
        if (!e.data || !triggers.includes(e.data)) {
            console.debug('[Orchestrator] Not in trigger keys, skipping');
            return;
        }

        const sel = window.getSelection()!;
        const text = sel.anchorNode!.textContent!;
        const offset = sel.anchorOffset;
        console.debug('[Orchestrator] textContent =', text, 'offset =', offset);

        const result = this.startingMarkerAlarm(text, offset, e.data);
        console.log(result)
        if (result === null) {
            console.debug("false alarm: no starting marker", e.data)
            return;
        };
        const [left, startingMarkers, right] = result
        console.debug('[Orchestrator] I found this starting markers:', left, "x", startingMarkers, right);

        if ("*`~_".indexOf(startingMarkers) >= 0) { // is inline marker, empty semantic-tag
            const semanticTag = new SemanticTag().fill(startingMarkers)
            console.debug("inline marker, mepty semantic", startingMarkers, semanticTag)

            // replace current parent with left, semanticTag, right
            const parent = sel.anchorNode!.parentElement!;
            parent.replaceWith(left, semanticTag, right)

            // Restore caret inside the empty semanticTag's text content (between markers)
            const targetTextNode = semanticTag.childNodes[1];
            const range = document.createRange();
            range.setStart(targetTextNode, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);

        } else { // for block markers, next line is the content for semantic tag
            const lines = right.split("\n")
            const firstLine = lines.at(0) || ""
            const semanticTag = new SemanticTag().fill(startingMarkers, firstLine)

            // find the block container under editorEl
            let block = sel.anchorNode as HTMLElement;
            if (sel.anchorNode!.nodeType === Node.TEXT_NODE) {
                block = sel.anchorNode!.parentElement!;
            }
            while (block && block.parentElement !== this.editorEl) {
                block = block.parentElement!;
            }
            if (block) {
                block.replaceWith(semanticTag);

                // place caret inside the semanticTag's content span
                sel.removeAllRanges();
                const newRange = document.createRange();
                const targetTextNode = semanticTag.childNodes[1];
                newRange.setStart(targetTextNode, firstLine.length);
                newRange.collapse(true);
                sel.addRange(newRange);
            }
        }
    }

    private startingMarkerAlarm(text: string, offset: number, char: string): [string, string, string] | null {
        // Since the char is already inserted, the char typed is at text[offset - 1]
        const left = text.substring(0, offset - 1);
        const right = text.substring(offset);

        // 1. Symmetrical / Inline markers
        if ("*`~_".indexOf(char) >= 0) {
            const precedingChar = offset - 2 >= 0 ? text[offset - 2] : '';
            const isPrecededByWhitespace = precedingChar === '' || /\s|\u00a0/.test(precedingChar);

            if (isPrecededByWhitespace) {
                return [left, char, right];
            }
        }

        // 2. Block marker headings or lists triggered with space
        if (char === ' ' || char === '\u00a0') {
            const trimmedLeft = left.trim();
            if (/^#+$/.test(trimmedLeft)) {
                return ['', trimmedLeft + ' ', right];
            }
            if (trimmedLeft === '-') {
                return ['', '- ', right];
            }
        }

        return null;
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
