import { SemanticRules } from './semantic-rules.ts';
import { StartMarker } from './start-marker.ts';
import { EndMarker } from './end-marker.ts';

export class SemanticTag extends HTMLElement {
    static nextId = 1;

    startMarker!: StartMarker;
    endMarker!: HTMLElement;

    set dataFromParser(val: { marker: string; content: DocumentFragment }) {
        // Defer unique ID generation safely to the setter
        this.id = `semantic-tag-${SemanticTag.nextId++}`;

        const { marker, content } = val;
        this.className = SemanticRules.getClass(marker);

        // 1. Create Start Marker
        const startMarker = new StartMarker();
        startMarker.initFromParser(marker, this.id);

        // 2. Create End Marker
        const endPair = SemanticRules.getClosingMarker(marker);
        const endMarker = new EndMarker();
        endMarker.initFromParser(endPair, this.id);

        // 3. Append them sequentially
        this.append(startMarker, content, endMarker);

        // 4. Cache wing references
        this.startMarker = startMarker;
        this.endMarker = endMarker;
    }

    set dataFromKeyboard(marker: string) {
        // Defer unique ID generation safely to the setter
        this.id = `semantic-tag-${SemanticTag.nextId++}`;

        const startMarker = new StartMarker();
        startMarker.initFromParser(marker, this.id);

        const endMarker = new EndMarker();
        const endPair = SemanticRules.getClosingMarker(marker);
        endMarker.initFromParser(endPair, this.id);

        this.append(startMarker, endMarker);

        this.startMarker = startMarker;
        this.endMarker = endMarker;
        this.className = startMarker.reclass(marker);
    }

    set startMarkerContent(content: string) {
        if (!this.id) {
            this.id = `semantic-tag-${SemanticTag.nextId++}`;
        }

        const marker = new StartMarker();
        marker.initFromInput(content, this.id);
        this.prepend(marker);
        this.startMarker = marker;

        this.className = marker.reclass(content);
    }
}

if (!customElements.get('semantic-tag')) {
    customElements.define('semantic-tag', SemanticTag);
}
