/**
 * The first `=` after `nameNode` that starts before `valueStart`, with the token before it. Null when there is no such
 * `=`, or when anything but spaces or tabs, such as a comment, sits between the two tokens, since the alignment fix
 * rewrites that gap.
 */
export function findAlignedToken(sourceCode, nameNode, valueStart) {
    let token = sourceCode.getTokenAfter(nameNode);
    while (token && token.range[0] < valueStart) {
        if (token.value === '=') {
            const tokenBefore = sourceCode.getTokenBefore(token);
            return /^[ \t]*$/.test(sourceCode.text.slice(tokenBefore.range[1], token.range[0])) ? { equalsToken: token, tokenBefore } : null;
        }
        token = sourceCode.getTokenAfter(token);
    }
    return null;
}
/**
 * Reports each line whose `=` is not in the column one past the widest token before an `=` in the run, with a fix that
 * pads the gap with spaces. A run of fewer than two lines has nothing to align with.
 */
export function reportMisalignedRun(context, run, message) {
    if (run.length < 2) {
        return;
    }
    const equalsColumn = Math.max(...run.map(line => line.tokenBefore.loc.end.column)) + 1;
    for (const line of run) {
        if (line.equalsToken.loc.start.column === equalsColumn) {
            continue;
        }
        context.report({
            node: line.member,
            loc: line.equalsToken.loc.start,
            message,
            fix: fixer => fixer.replaceTextRange([line.tokenBefore.range[1], line.equalsToken.range[0]], ' '.repeat(equalsColumn - line.tokenBefore.loc.end.column)),
        });
    }
}
/** Splits `items`, in order, wherever `isSameRun` says two neighbours do not belong together. */
export function splitIntoRuns(items, isSameRun) {
    const runs = [];
    items.forEach((item, index) => {
        if (index === 0 || !isSameRun(items[index - 1], item)) {
            runs.push([]);
        }
        runs.at(-1).push(item);
    });
    return runs;
}
