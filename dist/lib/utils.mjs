import _ from 'lodash';
export function hasPropsWithValues(node, attributes) {
    if (!node) {
        return false;
    }
    return _.isEmpty(attributes) ? true : _.every(attributes, (val, key) => _.get(node, key) === attributes[key]);
}
export function getSourceCode(context) {
    const ctx = context;
    return ctx.sourceCode ?? ctx.getSourceCode();
}
export function isSingleLine(node) {
    return node.loc.start.line === node.loc.end.line;
}
export function getLine(node, sourceCode) {
    return sourceCode.lines[node.loc.start.line - 1];
}
/** The line `node` sits on with `replacement` in its place, from the start of its first line to the end of its last. */
export function getReplacementLine(node, replacement, sourceCode) {
    const firstLine = sourceCode.lines[node.loc.start.line - 1];
    const lastLine = sourceCode.lines[node.loc.end.line - 1];
    return firstLine.slice(0, node.loc.start.column) + replacement + lastLine.slice(node.loc.end.column);
}
export function getLineIndent(node, sourceCode) {
    return getIndentOfLine(sourceCode, node.loc.start.line);
}
/** The leading whitespace of a line, numbered from 1. */
export function getIndentOfLine(sourceCode, lineNumber) {
    return sourceCode.lines[lineNumber - 1].match(/^\s*/)[0];
}
export function getChildIndent(baseIndent) {
    return `${baseIndent}\t`;
}
/** `\r\n` when the file uses it anywhere, otherwise `\n`. */
export function getLineEnding(sourceCode) {
    return sourceCode.text.includes('\r\n') ? '\r\n' : '\n';
}
/** The blank lines in a run of whitespace between two pieces of code: one fewer than its line breaks. */
export function countBlankLines(whitespace) {
    return Math.max(0, (whitespace.match(/\n/g)?.length ?? 0) - 1);
}
/** Whether any comment overlaps the text from `start` to `end`, even in part. */
export function hasCommentsInRange(sourceCode, start, end) {
    return sourceCode.getAllComments().some(comment => comment.range[1] > start && comment.range[0] < end);
}
/**
 * The longest a line may be before a rule wraps it over several lines.
 *
 * Rules that wrap a construct whose line is too long, and unwrap it again once it fits, take a `maxLen` and a
 * `maxLenBuffer`. The buffer adds hysteresis on both sides of `maxLen`, so a construct sitting just above the limit
 * does not ping-pong between the two forms on successive lint passes:
 *
 * - **Wrap** when the single-line length is `> maxLen + maxLenBuffer`
 * - **Unwrap** when the collapsed length is `<= maxLen - maxLenBuffer` (see getUnwrapMaxLen)
 *
 * Lengths between those thresholds are left unchanged. The rules default `maxLenBuffer` to `5`; set it to `0` to wrap
 * above `maxLen` and unwrap at or below it.
 *
 * @example maxLen 140, maxLenBuffer 10
 * - Single line 141 chars → stay single line (141 <= 150)
 * - Single line 151 chars → wrap to multiline
 * - Collapsed 138 chars → stay multiline (138 > 130)
 * - Collapsed 129 chars → unwrap to single line (129 <= 130)
 */
export function getWrapMaxLen({ maxLen, maxLenBuffer }) {
    return maxLen + maxLenBuffer;
}
/** The longest a collapsed line may be for a rule to unwrap it onto one line; see getWrapMaxLen. */
export function getUnwrapMaxLen({ maxLen, maxLenBuffer }) {
    return Math.max(0, maxLen - maxLenBuffer);
}
/** Schemas for the `maxLen` and `maxLenBuffer` options that getWrapMaxLen and getUnwrapMaxLen read. */
export const maxLenSchema = {
    maxLen: {
        type: 'integer',
        minimum: 1,
    },
    maxLenBuffer: {
        type: 'integer',
        minimum: 0,
    },
};
function isNodeAnIdentifierWithName(node, subNode, name) {
    return hasPropsWithValues(node, { [`${subNode}.type`]: 'Identifier', [`${subNode}.name`]: name });
}
export function isPropertyAnIdentifierWithName(node, name) {
    return isNodeAnIdentifierWithName(node, 'property', name);
}
export function isObjectAnIdentifierWithName(node, name) {
    return isNodeAnIdentifierWithName(node, 'object', name);
}
function isUnaryExpression(scope, operator) {
    return scope.parent?.type === 'UnaryExpression' && scope.parent.operator === operator;
}
export function isRequireCallLiteral(node) {
    if (!node || node.type !== 'CallExpression') {
        return false;
    }
    return isNodeAnIdentifierWithName(node, 'callee', 'require')
        && node.arguments.length === 1
        && node.arguments[0].type === 'Literal';
}
export function isRequireCallArrayExpression(node) {
    if (!node || node.type !== 'CallExpression') {
        return false;
    }
    return isNodeAnIdentifierWithName(node, 'callee', 'require')
        && node.arguments.length > 0
        && node.arguments[0].type === 'ArrayExpression';
}
export function isRequireCall(node) {
    return isRequireCallLiteral(node) || isRequireCallArrayExpression(node);
}
export function getLiteralModuleNamesFromRequireCall(node) {
    if (!isRequireCall(node) || node.type !== 'CallExpression') {
        return [];
    }
    if (isRequireCallLiteral(node)) {
        return node.arguments.filter((arg) => arg.type === 'Literal');
    }
    const firstArgument = node.arguments[0];
    if (!firstArgument || firstArgument.type !== 'ArrayExpression') {
        return [];
    }
    return firstArgument.elements.filter((element) => element !== null && element.type === 'Literal');
}
export function lodashAutofix(node, context, type, fixer) {
    let scope = node.parent;
    if (!scope || scope.type !== 'CallExpression' || scope.arguments.length > 1) {
        return;
    }
    const arg = scope.arguments[0];
    let negate = false;
    if (isUnaryExpression(scope, '!')) {
        negate = !negate;
        scope = scope.parent;
    }
    if (isUnaryExpression(scope, '!')) {
        negate = !negate;
        scope = scope.parent;
    }
    const fixToAppend = negate ? ` !== ${type}` : ` === ${type}`;
    const sourceCode = getSourceCode(context);
    let fixedCode = sourceCode.getText(arg) + fixToAppend;
    if (scope.parent?.type === 'BinaryExpression') {
        fixedCode = `(${fixedCode})`;
    }
    return fixer.replaceText(scope, fixedCode);
}
export function namedCase(name, testCase, options = {}) {
    const base = typeof testCase === 'string' ? { code: testCase } : testCase;
    return { ...base, ...options, name };
}
export function trimCodeWhitespace(testCases) {
    if (Array.isArray(testCases)) {
        return testCases.map(trimCodeWhitespace);
    }
    if (typeof testCases === 'object' && testCases !== null) {
        return Object.fromEntries(Object.entries(testCases).map(([key, value]) => {
            if ((key === 'code' || key === 'output') && typeof value === 'string') {
                return [key, value
                        .split('\n')
                        .map(line => line.replace(/^\s+/, ''))
                        .join('\n')
                        .trim()];
            }
            return [key, trimCodeWhitespace(value)];
        }));
    }
    return testCases;
}
export function isLiteralTrue(node) {
    return node.type === 'Literal' && node.value === true;
}
