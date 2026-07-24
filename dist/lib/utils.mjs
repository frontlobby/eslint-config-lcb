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
export function getLineIndent(node, sourceCode) {
    return getLine(node, sourceCode).match(/^\s*/)[0];
}
export function getChildIndent(baseIndent) {
    return `${baseIndent}\t`;
}
export function getWrapMaxLen(maxLen, maxLenBuffer) {
    return maxLen + maxLenBuffer;
}
export function getUnwrapMaxLen(maxLen, maxLenBuffer) {
    return Math.max(0, maxLen - maxLenBuffer);
}
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
