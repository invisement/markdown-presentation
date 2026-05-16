import { DomServicerFace, MarkerTopicValue, MarkerRemovedTopicValue, MdNodeTag } from './dom-servicer.ts';
import { MarkdownParserFace, Schema } from './markdown-parser.ts';

/**
 * Contract for the Editor Orchestrator.
 * Responsibility: Wires publishers to surgical actions.
 */
export interface EditorOrchestratorFace {
    syncPairedMarkers(val: MarkerTopicValue): void;
    transformBlockStructure(val: MarkerTopicValue): void;
    reparseCollapsedBlock(val: MarkerRemovedTopicValue): void;
    unwrapInlineStyle(val: MarkerRemovedTopicValue): void;
    handleBlockInput(block: HTMLElement): void;
    loadSample(): Promise<void>;
}

interface IPairRule {
    match: RegExp;
    sync: (content: string, isStart: boolean) => string;
}

const PAIR_RULES: IPairRule[] = [
    { match: /^(\*\*|\*|`)$/, sync: (content: string) => content },
    { match: /^```/, sync: (content: string, isStart: boolean) => isStart ? '```' : content },
    { match: /^<(\/?[a-z1-6]+).*?>$/i, sync: (content: string, isStart: boolean) => {
        const m = content.match(/<(\/?[a-z1-6]+)/i);
        if (!m) return content;
        const tag = m[1].replace('/', '');
        return isStart ? `</${tag}>` : `<${tag}>`;
    }}
];

/**
 * EditorOrchestrator — The "Brain" that coordinates actions based on topics.
 */
export class EditorOrchestrator implements EditorOrchestratorFace {
    constructor(
        private dom: DomServicerFace,
        private parser: MarkdownParserFace,
        private editorEl: HTMLElement
    ) {}

    public syncPairedMarkers(val: MarkerTopicValue) {
        const { marker, content, parent } = val;
        const ctrls = Array.from(parent.querySelectorAll('md-ctrl')) as any[];
        if (ctrls.length === 2) {
            const isStart = ctrls[0] === marker;
            const other = isStart ? ctrls[1] : ctrls[0];
            const rule = PAIR_RULES.find(r => r.match.test(content));
            if (rule) {
                const nextVal = rule.sync(content, isStart);
                if (other.textContent !== nextVal) other.syncContent(nextVal);
            }
        }
    }

    public transformBlockStructure(val: MarkerTopicValue) {
        const { marker, content, parent } = val;
        const targetTag = this.identifyTargetTag(content, parent.tagName);
        if (targetTag && targetTag !== parent.tagName) {
            console.debug(`[FLOW] transformBlockStructure | trigger node swap: <${parent.tagName.toLowerCase()}> -> <${targetTag.toLowerCase()}>`);
            if (targetTag === 'P') {
                this.dom.replaceNode(parent, this.parser.parseBlock(parent.innerText));
            } else if (targetTag === 'PRE') {
                this.dom.replaceNode(parent, this.parser.parseDocument(parent.innerText));
            } else {
                this.dom.swapNodes(marker as unknown as HTMLElement, targetTag as MdNodeTag);
            }
        }
    }

    public reparseCollapsedBlock(val: MarkerRemovedTopicValue) {
        const { lastParent } = val;
        if (lastParent.tagName === 'PRE') {
            this.dom.replaceNode(lastParent, this.parser.parseDocument(lastParent.innerText));
        }
    }

    public unwrapInlineStyle(val: MarkerRemovedTopicValue) {
        const { lastParent } = val;
        const remaining = lastParent.querySelectorAll('md-ctrl');
        if (remaining.length === 1) {
            this.dom.removeNode(remaining[0] as unknown as HTMLElement);
            return;
        }
        if (remaining.length === 0 && /^(B|I|CODE)$/.test(lastParent.tagName)) {
            this.dom.unwrapNode(lastParent);
        }
    }

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

    private identifyTargetTag(content: string, currentTag: string): string | null {
        const hMatch = content.match(/^(#{1,6})[\s\u00A0]$/);
        if (hMatch) {
            const level = hMatch[1].length;
            console.debug(`[TRACE] identifyTargetTag | detected Header level ${level}`);
            return 'H' + level;
        }
        if (/^-[\s\u00A0]$/.test(content)) return 'LI';
        if (/^```/.test(content)) return 'PRE';
        const t = content.trim();
        const tag = currentTag.toUpperCase();
        if (t === '**' && tag !== 'B') return 'B';
        if (t === '*' && tag !== 'I') return 'I';
        if (t === '`' && tag !== 'CODE') return 'CODE';
        if (/^(H[1-6]|LI|PRE)$/.test(tag)) return 'P';
        return null;
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
