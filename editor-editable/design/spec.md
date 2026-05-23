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

### Key Invariant

```
editorNode.innerText === originalMarkdown
```

The DOM structure must always round-trip: all markdown control characters are stored as **visible text nodes** inside the DOM. `innerText` naturally concatenates them back into valid markdown.
