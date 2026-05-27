import { SemanticRules } from './semantic-rules.ts';
import { StartMarker } from './start-marker.ts';
import './end-marker.ts';

export class SemanticTag extends HTMLElement {
    static nextId = 1;

    startMarker!: StartMarker;
    endMarker!: HTMLElement;

    constructor() {
        super();
        this.id = `semantic-tag-${SemanticTag.nextId++}`;

        const endMarker = document.createElement("end-marker");
        endMarker.setAttribute('parent-id', this.id);
        this.append(endMarker);
        this.endMarker = endMarker;
    }

    set startMarkerContent(content: string) {
        const marker = new StartMarker(content);
        marker.setAttribute('parent-id', this.id);
        this.prepend(marker);
        this.startMarker = marker;

        this.className = marker.reclass(content);
    }
}

if (!customElements.get('semantic-tag')) {
    customElements.define('semantic-tag', SemanticTag);
}
