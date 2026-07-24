import _ from 'lodash';
import { BaseESLintRule } from "../BaseESLintRule.mjs";
import { getChildIndent, getLine, getLineIndent, getSourceCode, getUnwrapMaxLen, getWrapMaxLen, isSingleLine } from "../utils.mjs";
const defaultMaxLen = 100;
const splitMessage = 'Ternary should be split over multiple lines when it exceeds the line limit';
const collapseMessage = 'Ternary should be on a single line when it fits within the line limit';
/**
 * Collapse or expand ternary expressions based on line length.
 *
 * ## `maxLen` / `maxLenBuffer`
 *
 * Single-line ternary expressions are split across multiple lines when the
 * containing line exceeds `maxLen`. Multiline ternaries may be collapsed back to
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
export class MultilineTernary extends BaseESLintRule {
    static meta = {
        type: 'layout',
        docs: {
            description: 'Collapse or expand ternary expressions based on line length. See rule source for `maxLenBuffer` hysteresis.',
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
        const rule = new MultilineTernary(context);
        return {
            ConditionalExpression(node) {
                rule.checkConditionalExpression(node);
            },
        };
    }
    checkConditionalExpression(node) {
        if (!isEligibleTernary(node, this.sourceCode)) {
            return;
        }
        if (isSingleLine(node)) {
            this.checkSingleLineTernary(node);
            return;
        }
        this.checkMultiLineTernary(node);
    }
    checkSingleLineTernary(node) {
        const line = getLine(node, this.sourceCode);
        if (line.length <= this.getWrapMaxLen()) {
            return;
        }
        this.context.report({
            node,
            message: splitMessage,
            fix: fixer => fixer.replaceText(node, getMultiLineTernaryText(node, this.sourceCode)),
        });
    }
    checkMultiLineTernary(node) {
        const replacement = getSingleLineTernaryText(node, this.sourceCode);
        const line = getReplacementLine(node, replacement, this.sourceCode);
        if (line.length > this.getUnwrapMaxLen()) {
            return;
        }
        this.context.report({ node, message: collapseMessage, fix: fixer => fixer.replaceText(node, replacement) });
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
function isEligibleTernary(node, sourceCode) {
    if (node.parent.type === 'ConditionalExpression') {
        return false;
    }
    if (!isCollapsibleOperand(node.test, sourceCode)
        || !isCollapsibleOperand(node.consequent, sourceCode)
        || !isCollapsibleOperand(node.alternate, sourceCode)) {
        return false;
    }
    return isCleanSpan(node.range[0], node.range[1], sourceCode);
}
function isCollapsibleOperand(node, sourceCode) {
    return isSingleLine(node)
        && !containsNestedTernary(node)
        && _.isEmpty(sourceCode.getCommentsInside(node));
}
function containsNestedTernary(node) {
    return node.type === 'ConditionalExpression'
        || getChildExpressions(node).some(child => containsNestedTernary(child));
}
function getChildExpressions(node) {
    if (node.type === 'ParenthesizedExpression') {
        return [node.expression];
    }
    switch (node.type) {
        case 'ArrayExpression':
            return node.elements.filter((element) => element != null && element.type !== 'SpreadElement');
        case 'ArrowFunctionExpression':
            return node.expression && node.body.type !== 'BlockStatement' ? [node.body] : [];
        case 'AssignmentExpression':
        case 'BinaryExpression':
        case 'LogicalExpression':
            return [node.left, node.right];
        case 'CallExpression':
        case 'NewExpression':
            return [
                node.callee,
                ...node.arguments.filter((argument) => argument.type !== 'SpreadElement'),
            ];
        case 'ChainExpression':
            return [node.expression];
        case 'MemberExpression':
            return [node.object, ...(node.computed ? [node.property] : [])];
        case 'SequenceExpression':
            return node.expressions;
        case 'TemplateLiteral':
            return node.expressions;
        case 'UnaryExpression':
        case 'UpdateExpression':
            return [node.argument];
        case 'YieldExpression':
            return node.argument ? [node.argument] : [];
        case 'AwaitExpression':
            return [node.argument];
        case 'TaggedTemplateExpression':
            return [node.tag, node.quasi];
        default:
            return [];
    }
}
function getSingleLineTernaryText(node, sourceCode) {
    const testText = sourceCode.getText(node.test);
    const trueText = sourceCode.getText(node.consequent);
    const falseText = sourceCode.getText(node.alternate);
    return `${testText} ? ${trueText} : ${falseText}`;
}
function getMultiLineTernaryText(node, sourceCode) {
    const baseIndent = getLineIndent(node, sourceCode);
    const operatorIndent = getChildIndent(baseIndent);
    const testText = sourceCode.getText(node.test);
    const trueText = sourceCode.getText(node.consequent);
    const falseText = sourceCode.getText(node.alternate);
    return `${testText}\n${operatorIndent}? ${trueText}\n${operatorIndent}: ${falseText}`;
}
function getReplacementLine(node, replacement, sourceCode) {
    const firstLine = sourceCode.lines[node.loc.start.line - 1];
    const lastLine = sourceCode.lines[node.loc.end.line - 1];
    return firstLine.slice(0, node.loc.start.column) + replacement + lastLine.slice(node.loc.end.column);
}
function isCleanSpan(start, end, sourceCode) {
    return sourceCode.getAllComments().every(comment => comment.range[1] <= start || comment.range[0] >= end);
}
