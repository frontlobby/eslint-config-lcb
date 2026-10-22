import _ from 'lodash';
import { BaseESLintRule } from "../BaseESLintRule.mjs";
import { getChildIndent, getLine, getLineIndent, getReplacementLine, getUnwrapMaxLen, getWrapMaxLen, hasCommentsInRange, isSingleLine, maxLenSchema } from "../utils.mjs";
const defaultMaxLen = 100;
const splitMessage = 'Ternary should be split over multiple lines when it exceeds the line limit';
const collapseMessage = 'Ternary should be on a single line when it fits within the line limit';
/**
 * Collapse or expand ternary expressions based on line length.
 *
 * `maxLen` and `maxLenBuffer` work as described on getWrapMaxLen in `lib/utils.mts`.
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
                properties: { ...maxLenSchema },
                additionalProperties: false,
            },
        ],
    };
    options;
    constructor(context) {
        super(context);
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
        if (line.length <= getWrapMaxLen(this.options)) {
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
        if (line.length > getUnwrapMaxLen(this.options)) {
            return;
        }
        this.context.report({ node, message: collapseMessage, fix: fixer => fixer.replaceText(node, replacement) });
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
    return !hasCommentsInRange(sourceCode, node.range[0], node.range[1]);
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
