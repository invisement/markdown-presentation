import { PubSub } from '../../husk/ui/pubsub.ts';
import { DomServicerFace, MarkerTopicValue, MarkerRemovedTopicValue } from './dom-servicer.ts';
import { EditorOrchestratorFace } from './editor-orchestrator.ts';

/**
 * Global topics for the Markdown Editor.
 * These are "Active Variables" that represent the current state of modification.
 */
export const Topics = {
    markerChanged: new PubSub<MarkerTopicValue | null>(null),
    markerRemoved: new PubSub<MarkerRemovedTopicValue | null>(null),
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
    // 1. Marker Change Flow
    Topics.markerChanged.bus(
        [ (cb) => dom.onMarkerMutation(cb) ],
        [ (val) => {
            if (val) console.debug(`[FLOW] markerChanged | content: "${val.content}" | parent: <${val.parent.tagName.toLowerCase()}>`);
          },
          (val) => val && orch.syncPairedMarkers(val), 
          (val) => val && orch.transformBlockStructure(val) ]
    );

    // 2. Marker Removal Flow
    Topics.markerRemoved.bus(
        [ (cb) => dom.onMarkerRemoved(cb) ],
        [ (val) => val && orch.reparseCollapsedBlock(val),
          (val) => val && orch.unwrapInlineStyle(val) ]
    );

    // 3. Raw Block Input Flow
    editorEl.addEventListener('input', (e: Event) => {
        let block = e.target as HTMLElement;
        while (block && block.parentElement !== editorEl) {
            block = block.parentElement!;
        }
        if (block) orch.handleBlockInput(block);
    });
}
