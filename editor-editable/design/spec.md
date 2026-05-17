# Editor Spec: Markdown ↔ DOM Translation

## Conceptual DOM Tree

```
div#editor [contenteditable="true"]
│
├── semantic-tag.h1
│   ├── span.marker.start →  "# "
│   └── span.content       →  "Hello "
│
├── semantic-tag.p
│   ├── span.marker.start →  ""
│   └── span.content       →  "A line with "
│       ├── semantic-tag.code
│       │   ├── span.marker.start →  "`"
│       │   ├── span.content       →  "code"
│       │   └── span.marker.end   →  "`"
│       ├── text               →  " and "
│       ├── span.marker.html-tag →  "<mark>"
│       ├── text               →  "highlighted"
│       └── span.marker.html-tag →  "</mark>"
│
└── semantic-tag.li
    ├── span.marker.start  →  "- "
    └── span.content       →  "first item "
        └── semantic-tag.b
            ├── span.marker.start  →  "**"
            ├── span.content       →  "bold"
            └── span.marker.end    →  "**"
```

## Translation Rules

### Block-level (line → wrapper element)

| Markdown pattern       | Component State          | Internal Markers (`span.marker`) |
|------------------------|--------------------------|---------------------------------|
| `# text`               | `<semantic-tag class="h1">` | `span.marker.start` ("# ")    |
| `## text`              | `<semantic-tag class="h2">` | `span.marker.start` ("## ")   |
| `- item`               | `<semantic-tag class="li">` | `span.marker.start` ("- ")    |
| `` ``` ``              | `<semantic-tag class="pre">`| `start` (`` ``` ``) + `end`   |
| plain text             | `<semantic-tag class="p">`  | (empty start marker)          |

### Inline (within a line)

| Markdown pattern       | Component State          | Internal Markers (`span.marker`) |
|------------------------|--------------------------|---------------------------------|
| `**text**`             | `<semantic-tag class="b">`  | `start` (`**`) + `end` (`**`)   |
| `*text*`               | `<semantic-tag class="i">`  | `start` (`*`) + `end` (`*`)     |
| `` `text` ``           | `<semantic-tag class="code">`| `start` (`` ` ``) + `end` (`` ` ``)|
| `<tag>text</tag>`      | `span.marker.html-tag`      | (Direct HTML spans, no wrapper) |

### Key Invariant

```
editorNode.innerText === originalMarkdown
```

The DOM structure must always round-trip: all markdown control characters are stored as **visible text nodes** inside the DOM. `innerText` naturally concatenates them back into valid markdown.
