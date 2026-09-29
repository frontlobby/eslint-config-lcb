# multiline-statement-padding

Requires exactly one blank line between a statement that spans three or more lines and the sibling
statements directly before and after it. Only neighbours in the same block, at the same indentation,
are compared. A statement at the start or end of a block is never padded against the enclosing
braces or a `case` label.

The separation is judged from the line **above** the gap. When a statement ends on a short line — no
longer than `shortLineLength` characters, ignoring indentation — a `});` or `}` has already parted it
from what follows, so no blank line is required and whatever spacing is there is left alone. A long
line above always takes its blank line, however short the statement below it begins.

A short closing line stops standing in for the blank line once the statements on both sides of the gap
are multi-line. Two of those butted together are the densest thing in a file, and a `});` between them
does not part them the way it parts a multi-line statement from a single short one.

Where the line above is short and the line below is short *and* opens a block, such as `if (fbq) {`,
a blank line is not merely unnecessary but unwanted, and the fix takes one out. Two short lines with
a blank line between them spend three lines saying nothing.

An `if` line is measured against `shortIfLineLength` instead, which is a little larger. Its condition
spends characters on `if (` and `) {` before it says anything, so it reads shorter than it measures.

An `if`/`else if`/`else` chain never counts as breaking on its own. It reads as one long statement,
so the bare `}` closing its last branch does not excuse the statement below it from its blank line
the way a `});` does, and that blank line wins over a short opening line that would otherwise refuse
one.

An `if` of three lines or fewer reads as a guard rather than as a branch of its own, and a guard reads
as one thought with what it guards. So a single-line statement directly above the guard that tests it
takes no blank line between them, and one already written there is taken out:

```js
const hostOk = url.hostname === 'app.asana.com' || url.hostname.endsWith('.asana.com');
if (!hostOk) {
	throw new Error(`Expected an app.asana.com URL, got: ${url.hostname}`);
}
```

An `if` chain is more than a guard, so the line above one still takes its blank line.

A guard sitting directly above a `return` is the same exception from the other side: where the return
fits on one line the blank line comes out, and a return that spans lines keeps its own. A guard and the
return it protects read as one thought, so the `}` between them parts nothing worth parting — and
where the return fits on one line, a blank line there is taken out rather than merely allowed. A
return that spans lines is a statement in its own right and keeps its blank line.

```js
if (!autoIDs) {
	autoIDs = await fetchAutoIDs();
}
return autoIDs;
```

It applies to statement lists in modules and scripts, blocks, `switch` cases, static blocks, and
TypeScript namespaces. Adjacent `import` declarations are skipped because `simple-import-sort` owns
their grouping. A multi-line import still gets padded against the code that follows it.

A comment on the last line of the previous statement stays with that statement. Any other comments
in the gap belong to the next statement, so a missing blank line is inserted above them. When a
comment sits between the two statements, it may have one blank line on each side of it.

## Options

```js
'local-rules/multiline-statement-padding' : [ 'error', {
	minLines          : 3,
	shortLineLength   : 10,
	shortIfLineLength : 15,
} ]
```

`minLines` is the number of lines a statement must span before it needs padding. The default is `3`.

`shortLineLength` is the length, ignoring indentation, at or below which a line counts as short and
so needs no blank line beside it. The default is `10`, which takes in `});`, `break;` and `if (fbq) {`.

`shortIfLineLength` is the same length for a line beginning `if (`. The default is `15`, which takes in
`if (a && b) {` where the general length would not.

## Examples

```js
// Incorrect
await table.hardReset({
	filter : { status : 'current' },
	limit  : 15,
});
const currentLoad = table.loadMore();
await table.hardReset({
	filter : { status : 'former' },
	limit  : 15,
});

// Correct
await table.hardReset({
	filter : { status : 'current' },
	limit  : 15,
});
const currentLoad = table.loadMore();

await table.hardReset({
	filter : { status : 'former' },
	limit  : 15,
});

// Incorrect: an if chain is one statement, and its closing brace is not a break on its own
if (canSaveDraft) {
	showAlert(message);
}
else {
	showSuccess(message);
}
this.isVisible = false;

// Also correct: `});` is short enough to separate the statements
items = _.sortBy(items, item => {
	return item.name;
});
if (request.sort.desc) {
	items = items.reverse();
}
```

```js
// Incorrect: `};` and `if (fbq) {` are both short, so the blank line between them says nothing
const config = {
	a : 1,
	b : 2,
};

if (fbq) {
	fbq('track');
}

// Correct
const config = {
	a : 1,
	b : 2,
};
if (fbq) {
	fbq('track');
}

// Correct: the line above is long, so the short `if` still takes its blank line
output.push(`${'='.repeat(20) + ansiEscapes.eraseEndLine}\n`);

if (newBuild) {
	output.push(ansiEscapes.cursorTo(0, 20));
}
```

The rule fixes these gaps automatically. It inserts a missing blank line, collapses runs of blank
lines down to one, and removes the blank line above a short line that opens a block.
