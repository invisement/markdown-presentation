
Let's design a new editor. It uses DOM as it is and is based on "editablecontent".

We have a custom md to html converter. works on single line of markdown as well.
it is similar to standard one just plugs control chars in its own span with class "md-control-char".

"# I am **bold** and header" becomes "<h1> <span class="md-control-char" class="header">#</span> I am <bold-node> <span class="md-control-char">**</span>bold<span class="md-control-char">**</span> </bold-node> and header</h1>"

Now dom can do everything for us. For instance editorNode.innerText will return plain markdown content. 

We attach a listener only for .md-control-char (or some other classes) that after change, run parentCheck(currentNode). 

It simply takes the parent node, takes its innerText, runs it through our custom parser, gets html back and replaces the parent node with the parsed html version.
- This mechanism can be done faster as well (optimized), we just illustrate the basic usage.

Question:
    the only problem with this is that when we replace the parent node with the parsed html version, we lose the cursor position and selection. We need to use proseMirror or similar library to handle this.
Answer:
    the browser handles the position, we are not worried about it. 




