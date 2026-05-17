import { PubSub } from '../../husk/ui/pubsub.ts';
import { DomServicerFace } from './dom-servicer.ts';
import { EditorOrchestratorFace } from './editor-orchestrator.ts';
export const Topics = {
    // Other global editor topics can be added here
};

/**
 * The CENTRAL LOGIC CENTER.
 * This function defines the declarative "Flow" of the entire application.
 */
export function setupFlow(
    dom: DomServicerFace,
    orch: EditorOrchestratorFace,
    editorEl: HTMLElement
) {
    // 1. Raw Block Input Flow
    editorEl.addEventListener('input', (e: Event) => {
        let block = e.target as HTMLElement;
        while (block && block.parentElement !== editorEl) {
            block = block.parentElement!;
        }
        if (block) orch.handleBlockInput(block);
    });
}
