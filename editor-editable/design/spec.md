# Editor Spec: Markdown ↔ DOM Translation

## Conceptual DOM Tree

```
div#editor [contenteditable="true"]
│
├── h1
│   ├── span.md-ctrl  →  "#"
│   ├── text           →  " Hello "
│   └── b
│       ├── span.md-ctrl  →  "**"
│       ├── text           →  "world"
│       └── span.md-ctrl  →  "**"
│
├── p
│   ├── text               →  "A line with "
│   ├── code
│   │   ├── span.md-ctrl   →  "`"
│   │   ├── text           →  "code"
│   │   └── span.md-ctrl   →  "`"
│   ├── text               →  " and "
│   ├── span.md-html-tag   →  "<mark>"
│   ├── text               →  "highlighted"
│   └── span.md-html-tag   →  "</mark>"
│
└── ul
    ├── li
    │   ├── span.md-ctrl   →  "-"
    │   └── text           →  " first item"
    └── li
        ├── span.md-ctrl   →  "-"
        ├── text           →  " "
        ├── b
        │   ├── span.md-ctrl  →  "**"
        │   ├── text           →  "bold"
        │   └── span.md-ctrl  →  "**"
        └── text           →  " item"
```

## Translation Rules

### Block-level (line → wrapper element)

| Markdown pattern       | DOM element         | Control chars in `span.md-ctrl` |
|------------------------|---------------------|---------------------------------|
| `# text`               | `<h1>`              | `# `                            |
| `## text`              | `<h2>`              | `## `                           |
| `### text`             | `<h3>`              | `### `                          |
| `- item`               | `<ul><li>`          | `- `                            |
| `` ``` ``              | `<pre><code>`       | `` ``` ``                       |
| plain text             | `<p>`               | (none)                          |

### Inline (within a line)

| Markdown pattern       | DOM element         | Control chars in `span.md-ctrl` |
|------------------------|---------------------|---------------------------------|
| `**text**`             | `<b>`               | `**` (open) + `**` (close)      |
| `*text*`               | `<i>`               | `*` (open) + `*` (close)        |
| `` `text` ``           | `<code>`            | `` ` `` (open) + `` ` `` (close)|
| `<tag>text</tag>`      | `<span.md-html-tag>`| `<tag>` + `</tag>` as text      |

### Key Invariant

```
editorNode.innerText === originalMarkdown
```

The DOM structure must always round-trip: all markdown control characters are stored as **visible text nodes** inside the DOM. `innerText` naturally concatenates them back into valid markdown.
