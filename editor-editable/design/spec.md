# Editor Spec: Markdown ↔ DOM Translation

## Conceptual DOM Tree

```
div#editor [contenteditable="true"]
│
├── semantic-tag.h1
│   ├── semantic-marker.marker.start       →  "# "
│   └── text                               →  "Hello "
│
├── semantic-tag.p
│   ├── semantic-marker.marker.start       →  ""
│   └── text                               →  "A line with "
│       ├── semantic-tag.code
│       │   ├── semantic-marker.marker.start   →  "`"
│       │   ├── text                           →  "code"
│       │   └── semantic-end-marker.marker.end →  "`"
│       ├── text                           →  " and "
│       ├── semantic-marker.marker.start   →  "<mark>"
│       ├── text                           →  "highlighted"
│       └── semantic-end-marker.marker.end →  "</mark>"
│
└── semantic-tag.li
    ├── semantic-marker.marker.start       →  "- "
    └── text                               →  "first item "
        └── semantic-tag.b
            ├── semantic-marker.marker.start   →  "**"
            ├── text                           →  "bold"
            └── semantic-end-marker.marker.end →  "**"
```

## Translation Rules

### Block-level (line → wrapper element)

| Markdown pattern       | Component State          | Internal Markers |
|------------------------|--------------------------|------------------|
| `# text`               | `<semantic-tag class="h1">` | `semantic-marker.marker.start` ("# ")    |
| `## text`              | `<semantic-tag class="h2">` | `semantic-marker.marker.start` ("## ")   |
| `- item`               | `<semantic-tag class="li">` | `semantic-marker.marker.start` ("- ")    |
| `` ``` ``              | `<semantic-tag class="pre">`| `start` (`` ``` ``) + `end` (`semantic-end-marker`)|
| plain text             | `<semantic-tag class="p">`  | (empty start marker)          |

### Inline (within a line)

| Markdown pattern       | Component State          | Internal Markers |
|------------------------|--------------------------|------------------|
| `**text**`             | `<semantic-tag class="b">`  | `start` (`**`) + `end` (`**`)   |
| `*text*`               | `<semantic-tag class="i">`  | `start` (`*`) + `end` (`*`)     |
| `` `text` ``           | `<semantic-tag class="code">`| `start` (`` ` ``) + `end` (`` ` ``)|
| `<tag>text</tag>`      | `<semantic-tag class="html-tag">` | `start` (`<tag>`) + `end` (`</tag>`) |

### Key Invariant: The `textContent` Pillar

The DOM structure must always round-trip cleanly to valid Markdown without forcing browser reflows (avoiding `innerText` entirely). 

#### 1. Strict Invariant Rule
At any given physical keystroke or DOM mutation:
```javascript
editorNode.textContent === originalMarkdown
```
*Note: This strict approach requires the editor to insert physical newline (`\n`) text nodes between block elements to represent line breaks natively.*

#### 2. Weaker Invariant Rule (Transformation-Based)
Upon serialization or update request:
```javascript
const getMarkdown = (editor) => {
  return Array.from(editor.childNodes)
    .map(node => node.textContent)
    .join('\n');
};

getMarkdown(editorNode) === originalMarkdown;
```
*Note: This weaker approach allows the browser to utilize its native block editing features (like paragraph or div splits) without injecting unstable physical raw newlines into the editable DOM, while still keeping serialization 100% layout-independent and extremely performant.*
