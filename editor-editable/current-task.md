

- I think all our semantic-tags need to have a unique id
that is globally available to pick. why
    - each child or related tags (start-markers, end-marker, etc) can find each other when lost through copy/paste, etc.
    - Use id="semantic-tag-{unique number}" for semantic-tag and upppon creation of start-marker and end-marker stampt them parent-id=
    - uppon resurrection, tell parent, "I am here", it cause semantic-tag to change its wings start or end (probably would need select relevant children and move in/out of semantic-tag)
    - SemanticTag follows no-arg for cosntructor rule of web-components and will be initiated through .creatElement() and x.setData = data pattern.
    - the enfroce structure is <semantic-tag> <start-marker>**</start-marker> Hello World <end-marker>**</end-marker> </semantic-tag>



> NO DEFENSIVE CODING OF ANY SORT. STRAIGHT LOGIC. FAST, EFFICIENT, RAW, SIMPLE, EASY TO UNDERSTAND. ANY IF (checking for null, etc) consider a technical debt and needs to be written in technical debts with explanaition and an estimated iteration number to work on it and remove it. NO CONDITIONAL CHECK when we have not seen an error yet.


> I always like minimal change to the code change, so if a line does the job, leave it alone and better to follow the suit that replace with your prefered way of doing it.

> avoid cicular dependency


## Feature story:
- user types a marker "*"
- semantic-tag is created
- end-marker is created and connected.
- start-marker is created (with *) that causes reclass:
    - check my wings (left, middle, right)
    - is it valid?
    - return className or invalid

ALl three just need to have minimal to address the above story and feature architecture. 

## Task for LLM
We do not need to implement check-wings method(s) but need to implement the rest (main logic). 

Show the code for these three classes afresh here (in chat) with minimal supporting logic.

