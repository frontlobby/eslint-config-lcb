import { BaseESLintRule } from "../BaseESLintRule.mjs";
import { getLine, getLineIndent, getSourceCode, getUnwrapMaxLen, getWrapMaxLen, isSingleLine } from "../utils.mjs";
const defaultMaxLen = 100;
/**
 * Collapse or expand object literals based on line length.
 *
 * ## `maxLen` / `maxLenBuffer`
 *
 * Single-line object literals are split across multiple lines when the
 * containing line exceeds `maxLen`. Multiline objects may be collapsed back to
 * one line when the resulting line fits within the limit.
 *
 * `maxLenBuffer` adds hysteresis on both sides of `maxLen`:
 *
 * - **Split** when line length `> maxLen + maxLenBuffer`
 * - **Collapse** when collapsed line length `<= maxLen - maxLenBuffer`
 *
 * Default `maxLenBuffer` is `5`. Set to `0` to split above `maxLen` and collapse
 * at or below `maxLen` (legacy behavior).
 */
export class SingleLineJsonObject extends BaseESLintRule {
    static meta = {
        type: 'layout',
        docs: {
            description: 'Collapse or expand object literals based on line length. See rule source for `maxLenBuffer` hysteresis.',
            category: 'Stylistic Issues',
            recommended: false,
        },
        fixable: 'whitespace',
        schema: [
            {
                type: 'object',
                properties: {
                    maxLen: {
                        type: 'integer',
                        minimum: 1,
                    },
                    maxLenBuffer: {
                        type: 'integer',
                        minimum: 0,
                    },
                },
                additionalProperties: false,
            },
        ],
    };
    context;
    sourceCode;
    options;
    constructor(context) {
        super();
        this.context = context;
        this.sourceCode = getSourceCode(context);
        this.options = Object.assign({
            maxLen: defaultMaxLen,
            maxLenBuffer: 5,
        }, context.options[0]);
    }
    static create(context) {
        const rule = new SingleLineJsonObject(context);
        return {
            ObjectExpression(node) {
                rule.checkObjectExpression(node);
            },
        };
    }
    checkObjectExpression(node) {
        if (isNestedObjectValue(node)
            || !isCollapsibleObjectExpression(node, this.sourceCode)) {
            return;
        }
        if (isSingleLine(node)) {
            this.checkSingleLineObject(node);
            return;
        }
        this.checkMultiLineObject(node);
    }
    checkSingleLineObject(node) {
        const line = getLine(node, this.sourceCode);
        if (line.length <= this.getWrapMaxLen() || isEmpty(node.properties)) {
            return;
        }
        this.context.report({
            node,
            message: 'Object should be split over multiple lines when it exceeds the line limit',
            fix: fixer => fixer.replaceText(node, getMultiLineObjectText(node, this.sourceCode)),
        });
    }
    checkMultiLineObject(node) {
        const replacement = getSingleLineObjectText(node, this.sourceCode);
        const line = getReplacementLine(node, replacement, this.sourceCode);
        if (line.length > this.getUnwrapMaxLen()) {
            return;
        }
        this.context.report({
            node,
            message: 'Object should be on a single line when it fits within the line limit',
            fix: fixer => fixer.replaceText(node, replacement),
        });
    }
    getWrapMaxLen() {
        const { maxLen, maxLenBuffer } = this.options;
        return getWrapMaxLen(maxLen, maxLenBuffer);
    }
    getUnwrapMaxLen() {
        const { maxLen, maxLenBuffer } = this.options;
        return getUnwrapMaxLen(maxLen, maxLenBuffer);
    }
}
function isNestedObjectValue(node) {
    if (node.parent.type === 'ArrayExpression') {
        return true;
    }
    return node.parent.type === 'Property'
        && node.parent.value === node
        && node.parent.parent?.type === 'ObjectExpression';
}
function isCollapsibleObjectExpression(node, sourceCode) {
    return node.type === 'ObjectExpression'
        && isEmpty(sourceCode.getCommentsInside(node))
        && node.properties.every(property => isCollapsibleProperty(property, sourceCode));
}
function isCollapsibleProperty(property, sourceCode) {
    if (property.type === 'SpreadElement') {
        return isSingleLine(property.argument);
    }
    return property.type === 'Property'
        && property.kind === 'init'
        && property.method === false
        && isSingleLine(property.key)
        && isCollapsibleValue(property.value, sourceCode);
}
function getSingleLineObjectText(node, sourceCode) {
    return isEmpty(node.properties) ? '{}' : `{ ${node.properties.map(property => getPropertyText(property, sourceCode)).join(', ')} }`;
}
function getMultiLineObjectText(node, sourceCode) {
    const baseIndent = getLineIndent(node, sourceCode);
    const propertyIndent = `${baseIndent}\t`;
    const properties = node.properties
        .map(property => `${propertyIndent}${getPropertyText(property, sourceCode)},`)
        .join('\n');
    return `{\n${properties}\n${baseIndent}}`;
}
function getPropertyText(property, sourceCode) {
    if (property.type === 'SpreadElement') {
        return sourceCode.getText(property);
    }
    return property.shorthand ? sourceCode.getText(property) : `${getKeyText(property, sourceCode)} : ${getValueText(property.value, sourceCode)}`;
}
function getKeyText(property, sourceCode) {
    return property.computed ? `[${sourceCode.getText(property.key)}]` : sourceCode.getText(property.key);
}
function isCollapsibleValue(node, sourceCode) {
    if (node.type === 'ObjectExpression') {
        return isCollapsibleObjectExpression(node, sourceCode);
    }
    if (node.type === 'ArrayExpression') {
        return isEmpty(sourceCode.getCommentsInside(node))
            && node.elements.every(element => element && isCollapsibleValue(element, sourceCode));
    }
    return isSingleLine(node);
}
function getValueText(node, sourceCode) {
    if (node.type === 'ObjectExpression') {
        return getSingleLineObjectText(node, sourceCode);
    }
    if (node.type === 'ArrayExpression') {
        return isEmpty(node.elements) ? '[]' : `[ ${node.elements.map(element => getValueText(element, sourceCode)).join(', ')} ]`;
    }
    return sourceCode.getText(node);
}
function getReplacementLine(node, replacement, sourceCode) {
    const firstLine = sourceCode.lines[node.loc.start.line - 1];
    const lastLine = sourceCode.lines[node.loc.end.line - 1];
    return firstLine.slice(0, node.loc.start.column) + replacement + lastLine.slice(node.loc.end.column);
}
function isEmpty(value) {
    return value == null || value.length === 0;
}
