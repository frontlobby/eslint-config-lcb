import { BaseESLintRule } from "../BaseESLintRule.mjs";
import { getSourceCode } from "../utils.mjs";
const ifStatementStart = /^if\s*\(/;
const message = 'A multi-line statement should be separated from adjacent statements by exactly one blank line';
const unwantedMessage = 'A statement that opens a block on a short line should not have a blank line above it';
/**
 * Require exactly one blank line between a statement spanning `minLines` or more lines (default 3)
 * and the sibling statements directly before and after it. Only statements in the same block and at the
 * same indentation are compared, so a statement is never padded against its enclosing braces.
 *
 * A missing blank line is allowed when the line before or after the gap is no longer than
 * `shortLineLength` (default 10), such as `});` or an opening line like `if (fbq) {`. An `if` line is
 * allowed `shortIfLineLength` (default 15), since its condition costs characters the reader does not see
 * as length.
 *
 * Comments on the last line of the previous statement stay with it; any other comments in the gap
 * stay with the next statement, so a missing blank line is inserted above them.
 */
export class MultilineStatementPadding extends BaseESLintRule {
    static meta = {
        type: 'layout',
        docs: {
            description: 'Require exactly one blank line around statements that span multiple lines',
            category: 'Stylistic Issues',
            recommended: false,
        },
        fixable: 'whitespace',
        schema: [
            {
                type: 'object',
                properties: {
                    minLines: { type: 'integer', minimum: 2 },
                    shortLineLength: { type: 'integer', minimum: 0 },
                    shortIfLineLength: { type: 'integer', minimum: 0 },
                },
                additionalProperties: false,
            },
        ],
    };
    context;
    sourceCode;
    minLines;
    shortLineLength;
    shortIfLineLength;
    maxGuardLines = 3;
    constructor(context) {
        super();
        const options = context.options[0];
        this.context = context;
        this.sourceCode = getSourceCode(context);
        this.minLines = options?.minLines ?? 3;
        this.shortLineLength = options?.shortLineLength ?? 10;
        this.shortIfLineLength = options?.shortIfLineLength ?? 15;
    }
    static create(context) {
        const rule = new MultilineStatementPadding(context);
        return {
            'Program, BlockStatement, StaticBlock, TSModuleBlock'(node) {
                rule.checkStatements(node.body);
            },
            SwitchCase(node) {
                rule.checkStatements(node.consequent);
            },
        };
    }
    checkStatements(statements) {
        for (let index = 1; index < statements.length; index++) {
            const previous = statements[index - 1];
            const current = statements[index];
            if (this.shouldCheckPair(previous, current)) {
                this.checkGap(previous, current);
            }
        }
    }
    shouldCheckPair(previous, current) {
        // Import grouping is owned by simple-import-sort
        if (previous.type === 'ImportDeclaration' && current.type === 'ImportDeclaration') {
            return false;
        }
        if (previous.loc.end.line === current.loc.start.line) {
            return false;
        }
        // Only pad against neighbours at the same indentation level
        if (previous.loc.start.column !== current.loc.start.column) {
            return false;
        }
        return this.isMultiline(previous) || this.isMultiline(current);
    }
    isMultiline(statement) {
        return statement.loc.end.line - statement.loc.start.line + 1 >= this.minLines;
    }
    /**
     * A line such as `});`, or an opening line such as `if (fbq) {`, already reads as a break in its own
     * right, so no blank line is needed next to it. An `if` line gets a little more room, because its
     * condition spends characters on syntax rather than on anything the reader weighs as length.
     */
    isShortLine(lineNumber) {
        const line = this.sourceCode.lines[lineNumber - 1].trim();
        return line.length <= (ifStatementStart.test(line) ? this.shortIfLineLength : this.shortLineLength);
    }
    /**
     * A short line that opens a block, such as `if (fbq) {`. Short statements that open nothing, such as
     * `bar();`, are left to whatever spacing they were written with.
     */
    isShortBlockOpening(lineNumber) {
        return this.isShortLine(lineNumber) && this.sourceCode.lines[lineNumber - 1].trim().endsWith('{');
    }
    checkGap(previous, current) {
        const comments = this.sourceCode.getCommentsAfter(previous);
        const trailingComments = comments.filter(comment => comment.loc.start.line === previous.loc.end.line);
        const gapStart = trailingComments.at(-1)?.range[1] ?? previous.range[1];
        const gapEnd = getStatementStart(current);
        const gapComments = comments.slice(trailingComments.length).filter(comment => comment.range[1] <= gapEnd);
        const segments = getWhitespaceSegments(gapStart, gapEnd, gapComments);
        // The fix rewrites these segments wholesale, so anything but whitespace in one means the gap does not
        // cover what it is taken to, and rewriting it would delete code rather than reflow it.
        if (segments.some(([start, end]) => this.sourceCode.text.slice(start, end).trim() !== '')) {
            return;
        }
        const blankCounts = segments.map(([start, end]) => countBlankLines(this.sourceCode.text.slice(start, end)));
        const node = this.isMultiline(current) ? current : previous;
        const lineEnding = this.sourceCode.text.includes('\r\n') ? '\r\n' : '\n';
        const nextLine = (gapComments[0] ?? current).loc.start.line;
        // The break comes from the line above: a `});` or a `}` has already parted the two statements, and a
        // short line below only counts on top of that, so a long line above always takes its blank line.
        // An `if` chain never breaks this way — it reads as one long statement, so the `}` closing its last
        // branch is not the break a `});` is, and what follows always takes its blank line. A short `if`
        // guarding a return is the exception: guard and return read as one thought, so the `}` between them
        // parts nothing worth parting.
        // A short `if` reads as one thought with what it guards, on either side of it: the return it protects
        // below, or the single-line statement it tests above.
        const isGuardBeforeReturn = isShortGuard(previous, this.maxGuardLines) && current.type === 'ReturnStatement';
        const isGuardAfterSetup = isSingleLine(previous) && isShortGuard(current, this.maxGuardLines);
        const previousBreaks = (previous.type !== 'IfStatement' || isGuardBeforeReturn)
            && this.isShortLine(previous.loc.end.line);
        // A blank line comes out where the two statements read as one thought rather than two: a guard and the
        // single-line statement it tests or the return it protects, or a short line opening a block beneath
        // another short line. A return that spans lines is a statement in its own right and keeps its blank line.
        const blankLineUnwanted = isGuardBeforeReturn
            ? isSingleLine(current)
            : isGuardAfterSetup || previousBreaks && this.isShortBlockOpening(nextLine);
        if (blankLineUnwanted) {
            const paddedSegments = segments.filter((_segment, index) => blankCounts[index] > 0);
            if (paddedSegments.length) {
                this.context.report({
                    node,
                    message: unwantedMessage,
                    fix: fixer => paddedSegments.map(range => fixer.replaceTextRange(range, this.rewriteGap(range, 0, lineEnding))),
                });
            }
            return;
        }
        if (blankCounts.every(count => count === 0)) {
            // Unlike a line that opens a block, a short closing line reads fine with a blank line after it, so
            // one already written there is left alone. It stops standing in for the blank line once both sides
            // are multi-line statements, though: two of those butted together are the densest thing in a file,
            // and a `});` between them is not the break it is above a single short line.
            if (isGuardAfterSetup || previousBreaks && !(this.isMultiline(previous) && this.isMultiline(current))) {
                return;
            }
            const [firstStart, firstEnd] = segments[0];
            const newlineIndex = this.sourceCode.text.slice(firstStart, firstEnd).search(/\r?\n/);
            this.context.report({
                node,
                message,
                ...(newlineIndex === -1 ? {} : {
                    fix: fixer => fixer.insertTextBeforeRange([firstStart + newlineIndex, firstStart + newlineIndex], lineEnding),
                }),
            });
            return;
        }
        const excessSegments = segments.filter((_segment, index) => blankCounts[index] > 1);
        if (!excessSegments.length) {
            return;
        }
        this.context.report({
            node,
            message,
            fix: fixer => excessSegments.map(range => fixer.replaceTextRange(range, this.rewriteGap(range, 1, lineEnding))),
        });
    }
    /**
     * Rewrites a run of whitespace between two statements so it holds exactly `blankLines` blank lines,
     * keeping whatever indentation it ended with.
     */
    rewriteGap(range, blankLines, lineEnding) {
        const whitespace = this.sourceCode.text.slice(...range);
        const indent = whitespace.slice(whitespace.lastIndexOf('\n') + 1);
        return `${lineEnding.repeat(blankLines + 1)}${indent}`;
    }
}
/**
 * An `if` short enough to read as a guard rather than as a branch of its own.
 */
function isShortGuard(statement, maxGuardLines) {
    return statement.type === 'IfStatement'
        && statement.loc.end.line - statement.loc.start.line + 1 <= maxGuardLines;
}
function isSingleLine(statement) {
    return statement.loc.start.line === statement.loc.end.line;
}
/**
 * Decorators written above an `export` sit outside the exported statement's own range, so a statement's text
 * starts at its first decorator rather than at `range[0]`. Reading the gap up to `range[0]` instead would put
 * the decorators inside it, where the fix would overwrite them.
 */
function getStatementStart(statement) {
    const decorated = statement;
    const decorators = decorated.decorators ?? decorated.declaration?.decorators ?? [];
    return Math.min(statement.range[0], ...decorators.map(decorator => decorator.range[0]));
}
/**
 * Splits the gap between two statements into the whitespace runs around its comments.
 */
function getWhitespaceSegments(start, end, comments) {
    const boundaries = [start, ...comments.flatMap(comment => comment.range), end];
    const segments = [];
    for (let index = 0; index < boundaries.length; index += 2) {
        segments.push([boundaries[index], boundaries[index + 1]]);
    }
    return segments;
}
function countBlankLines(whitespace) {
    return Math.max(0, (whitespace.match(/\n/g)?.length ?? 0) - 1);
}
