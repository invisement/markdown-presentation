/**
 * semantic-tag.ts — The Autonomous Controller for Markdown structures.
 */


const markerTypes = {
    inline: ["~", "`", "*", "_", "<"],
    block: ["-", "#", ">"],
    inlineClasses: ["i", "b", "code", "u", "html-tag"],
    blockClasses: ["li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"],
}



/**
 * SemanticRules — Centralized lookup for AST types, CSS classes, and pairing markers.
 */
export const SemanticRules = {
    /**
     * 1. AST -> Marker: Maps a parser AST type to its default start marker.
     */
    astToMarker(type: string, depth?: number): string {
        switch (type) {
            case 'heading': return '#'.repeat(depth || 1) + ' ';
            case 'list_item': return '- ';
            case 'strong': return '**';
            case 'em': return '*';
            case 'codespan': return '`';
            case 'code': return '```\n';
            default: return '';
        }
    },

    /**
     * 2. Marker -> CSS Class: Maps a start marker to its CSS presentation class.
     */
    markerToClass(marker: string, existingClass?: string): string {
        // Browsers inject non-breaking spaces (\u00a0) in contenteditable. We must strip them.
        const m = marker.trim().replace(/\u00a0/g, '');

        if (m === '') {
            if (existingClass) {
                const isBlock = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'p'].includes(existingClass);
                return isBlock ? 'p' : 'span';
            }
            return 'p';
        }

        if (m === '**') return 'b';
        if (m === '*') return 'i';
        if (m === '`') return 'code';
        if (m.startsWith('#')) return 'h' + m.length;
        if (m === '-') return 'li';
        if (m.startsWith('```')) return 'pre';
        if (m.startsWith('<')) return 'html-tag';

        return 'p';
    },

    /**
     * 3. Pairing Rules: Determines the expected opposite marker (symmetric or HTML tags).
     */
    getPair(marker: string, isStart: boolean, currentOpposite?: string): string {
        const selfPairs = ['*', '`', "'", '"', '~']
        const matchingStarts = ["{", "[", "(", "<"]
        const matchingEnds = ["}", "]", ")", ">"]

        const m = marker.trim();

        if (selfPairs.includes(m[0])) return m; // if any starts with a self mathcing char, return self
        if (matchingStarts.includes(m[0])) {
            let i = matchingStarts.indexOf(m);
            if (i >= 0) return matchingEnds[i];

            // for block code
            if (m.startsWith("``")) {
                return m.match(/^`+/)?.[0] || '';
            }

            // for html tags
            if (m.startsWith('<')) {
                const match = m.match(/<([a-z1-6]+)/i);
                if (match) return `</${match[1]}>`;
            }
        }


        // if it is not in the list like #, it needs no pair => empty
        return '';


        if (isStart) {
            let i = matchingStarts.indexOf(m);
            if (i >= 0) return matchingEnds[i];

            // for block code
            if (m.startsWith("``")) {
                return m.match(/^`+/)?.[0] || '';
            }

            // for html tags
            if (m.startsWith('<')) {
                const match = m.match(/<([a-z1-6]+)/i);
                if (match) return `</${match[1]}>`;
            }
        } else {
            let i = matchingEnds.indexOf(m);
            if (i >= 0) return matchingStarts[i];

            // for block code
            if (m.startsWith("``")) {
                const backticks = m.match(/^`+/)?.[0] || '';
                if (currentOpposite) {
                    const currentRest = currentOpposite.replace(/^`+/, '');
                    return backticks + currentRest;
                }
                return backticks;
            }

            // for html tag
            if (m.startsWith('</')) {
                const match = m.match(/<\/([a-z1-6]+)/i);
                if (match) return `<${match[1]}>`;
            }
        }


        return '';
    }
};

import { SemanticMarker } from './semantic-marker.ts';

export class SemanticTag extends HTMLElement {
    #startMarker: HTMLElement | null = null; // includes defining boundries
    #endMarker: HTMLElement | null = null;  // includes defininf boundries

    fill(marker: string = "", content: string | Node[] = "") {
        // if (typeof content == "string") {
        //     content = [document.createTextNode(children)]
        // }

        console.log('class before fill', this.className, "masrker is", marker, "content is", content)

        const end = SemanticRules.getPair(marker, true);
        this.className = SemanticRules.markerToClass(marker);

        const startMarker = new SemanticMarker(marker, true);
        startMarker.className = 'marker start';

        const endMarker = new SemanticMarker(end, false);
        endMarker.className = 'marker end';


        this.append(startMarker, ...content, endMarker);

        return this;
    }

    constructor() {
        super();



        // const end = SemanticRules.getPair(marker, true);
        // this.className = SemanticRules.markerToClass(marker);

    }

    // we have 3 ways to start it: 
    // - when cloned (it has className but not content)
    //      - we want to find write class and then insert needed startedMarker
    //      - if inline classes is always pure text, so we should abort the semantic-tag.
    // - when intiated by hitting marker: no class but single char content
    // - when initiated from parsing: no class but full content
    connectedCallback() {
        this.#startMarker = this.querySelector('semantic-marker.start');
        this.#endMarker = this.querySelector('semantic-marker.end');

        const cssClass = this.className

        console.log("let's know", this, "has class", cssClass)

        if (!this.#startMarker?.textContent) {
            console.debug("it is inside empty marker, abort, no semantic-tag, just \n inside inline text")

            this.replaceWith(...this.childNodes)
            console.log("is it done?")

        }

        // if (cssClass) { // it is cloned if it already has className
        //     if (markerTypes.inlineClasses.includes(cssClass)) {  //for inline classes, abort, do not create a tag, it is all text inside inline tags

        //         console.debug("it is inside inline, abort, no semantic-tag, just \n inside inline text")
        //         this.replaceWith(...this.childNodes)
        //         console.log("is it done?")
        //         return;
        //     }
        //     if (markerTypes.blockClasses.includes(cssClass)) {
        //         this.className = "p";
        //     }
        // }



    }


    /**
     * Splits this semantic-tag and its parent block by inserting a temporary 
     * cursor marker, slicing the outerHTML, and cleanly closing/opening tags.
     */
    public split(anchorNode: Node, offset: number) {

        // no break between markers
        if (anchorNode.parentElement?.tagName === "SEMANTIC-MARKER") {
            return;
        }

        const textNode = anchorNode as Text;
        const splitMarker = "__CURSOR_SPLIT__";


        // Find our active block and inline tags
        let blockTag: SemanticTag;
        let inlineTag: SemanticTag | null = null;

        const isBlock = markerTypes.blockClasses.includes(this.className);
        if (isBlock) {
            blockTag = this;
        } else {
            inlineTag = this;
            blockTag = this.parentElement as SemanticTag;
        }

        // Insert the temporary split marker directly at the cursor
        textNode.insertData(offset, splitMarker);
        // Capture the outerHTML of the block tag containing our cursor marker
        const originalHTML = blockTag.outerHTML;
        // Clean up the text node immediately (delete the split marker from the live DOM)
        textNode.deleteData(offset, splitMarker.length);

        // Slice the HTML string cleanly in half by the split marker!
        const parts = originalHTML.split(splitMarker);
        let leftHTML = parts[0];
        let rightHTML = parts[1];

        console.debug("left and right htmls", leftHTML)
        console.debug(" right htmls", rightHTML)

        const blockClass = blockTag.className;
        const blockMarker = blockTag.#startMarker?.textContent || "";

        const inlineClass = inlineTag ? inlineTag.className : "";
        const inlineMarker = inlineTag ? inlineTag.#startMarker!.textContent! : "";

        const inlineClosingMarks = SemanticRules.getPair(inlineMarker, true);

        const inlineClosing = inlineTag ? `<semantic-marker class="marker end">${inlineClosingMarks}</semantic-marker></semantic-tag>` : ``;

        const blockClosing = `<semantic-marker class="marker end"></semantic-marker></semantic-tag>`;

        // Open all active tags on the Right HTML string
        let blockOpening = `<semantic-tag class="${blockClass}"><semantic-marker class="marker start">${blockMarker}</semantic-marker>`;
        let inlineOpening = inlineTag ? `<semantic-tag class="${inlineClass}"><semantic-marker class="marker start">${inlineMarker}</semantic-marker>` : ``;

        leftHTML = leftHTML + inlineClosing + blockClosing
        rightHTML = blockOpening + inlineOpening + rightHTML

        //blockTag.outerHTML = leftHTML

        const range = document.createRange();
        const fragmentLeft = range.createContextualFragment(leftHTML);
        const fragmentRight = range.createContextualFragment(rightHTML);

        console.debug(leftHTML + inlineClosing + blockClosing)
        console.debug(fragmentLeft)

        console.debug("parent", blockTag, blockTag.parentNode, blockTag.parentElement)

        blockTag.replaceWith(fragmentLeft, fragmentRight)

    }


    /**
     * Splits this semantic-tag and parent block using pure JavaScript DOM operations.
     * Collects and moves sibling nodes after the split point directly into a new tag.
     */
    public split2(anchorNode: Node, offset: number) {
        if (anchorNode.parentElement?.tagName === "SEMANTIC-MARKER") {
            return;
        }

        const textNode = anchorNode as Text;

        // 1. Split the text node exactly at the cursor
        const rightText = textNode.splitText(offset);

        // 2. Identify active block and inline tag references
        let blockTag: SemanticTag;
        let inlineTag: SemanticTag | null = null;

        const isBlock = markerTypes.blockClasses.includes(this.className);
        if (isBlock) {
            blockTag = this;
            const parent = textNode.parentElement;
            if (parent && parent !== this && parent.tagName === "SEMANTIC-TAG") {
                inlineTag = parent as SemanticTag;
            }
        } else {
            inlineTag = this;
            blockTag = this.parentElement as SemanticTag;
        }

        const blockClass = blockTag.className;
        const blockMarker = blockTag.#startMarker?.textContent || "";
        const inlineClass = inlineTag ? inlineTag.className : "";
        const inlineMarker = inlineTag ? inlineTag.#startMarker!.textContent! : "";

        // 3. Create the new Right Block sibling tag in the DOM
        const rightBlock = document.createElement('semantic-tag') as SemanticTag;
        rightBlock.className = blockClass;
        blockTag.after(rightBlock);

        // 4. Prepend the block marker to the new Right Block
        if (blockMarker) {
            const newBlockStart = new SemanticMarker(blockMarker, true);
            newBlockStart.className = "marker start";
            rightBlock.appendChild(newBlockStart);
        }

        // 5. If we have a nested inline tag, split it and close the left inline tag
        if (inlineTag) {
            // Close the left inline tag
            const inlineClosingMarks = SemanticRules.getPair(inlineMarker, true);
            const leftInlineEnd = new SemanticMarker(inlineClosingMarks, false);
            leftInlineEnd.className = "marker end";
            inlineTag.appendChild(leftInlineEnd);

            // Create the right inline tag
            const rightInline = document.createElement('semantic-tag') as SemanticTag;
            rightInline.className = inlineClass;

            const newInlineStart = new SemanticMarker(inlineMarker, true);
            newInlineStart.className = "marker start";
            rightInline.appendChild(newInlineStart);
            rightBlock.appendChild(rightInline);

            // Move the split text and siblings inside the inline tag
            let inlineNext: Node | null = rightText;
            const inlineNodesToMove: Node[] = [];
            while (inlineNext) {
                inlineNodesToMove.push(inlineNext);
                inlineNext = inlineNext.nextSibling;
            }
            for (const node of inlineNodesToMove) {
                rightInline.appendChild(node);
            }

            // Move subsequent siblings of the left inline tag inside the block
            let blockNext = inlineTag.nextSibling;
            const blockNodesToMove: Node[] = [];
            while (blockNext) {
                blockNodesToMove.push(blockNext);
                blockNext = blockNext.nextSibling;
            }
            for (const node of blockNodesToMove) {
                rightBlock.appendChild(node);
            }
        }
        else {
            // Case 2: No inline tag. Move split text and siblings directly to right block
            let blockNext: Node | null = rightText;
            const blockNodesToMove: Node[] = [];
            while (blockNext) {
                blockNodesToMove.push(blockNext);
                blockNext = blockNext.nextSibling;
            }
            for (const node of blockNodesToMove) {
                rightBlock.appendChild(node);
            }
        }

        // 6. Reposition the cursor caret directly at the start of the right text node
        const sel = window.getSelection()!;
        const newRange = document.createRange();
        newRange.setStart(rightText, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
    }


    public onMarkerRemove() {
        this.#endMarker?.remove();
        this.#startMarker?.remove();
        this.className = SemanticRules.markerToClass("", this.className);
    }

    public onMarkerChange(marker: string, isStart = true) {
        const pair = SemanticRules.getPair(marker, isStart);

        // if we dont check that pair is different from current, these twins will triger updating each other forever
        if (isStart && this.#endMarker!.textContent !== pair) {
            this.#endMarker!.textContent = pair
        }
        if (!isStart && this.#startMarker!.textContent !== pair) {
            this.#startMarker!.textContent = pair
        }

        this.className = SemanticRules.markerToClass(marker);
    }

    public grabLeft(isStart = true): string {
        const node = isStart ? this.previousSibling! : this.#endMarker!.previousSibling!;
        const leftString = node.textContent!.slice(-20);

        if (this.className === "li") {
            return leftString.match(/.\s*$/)![0];
        }
        return leftString.at(-1)!;
    }

    public grabRight(isStart = true): string {
        const isInline = ["b", "i", "code", "del"].includes(this.className);
        if (isInline) return "";

        const node = isStart ? this.#startMarker!.nextSibling! : this.nextSibling!;
        const rightString = node.textContent!.slice(0, 20);

        return rightString.at(0)!;
    }
}

if (!customElements.get('semantic-tag')) {
    customElements.define('semantic-tag', SemanticTag);
}
