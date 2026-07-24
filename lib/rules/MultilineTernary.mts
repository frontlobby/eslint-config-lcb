import type { Rule, SourceCode } from 'eslint';
import type { ConditionalExpression, Expression, Node } from 'estree';
import _                         from 'lodash';

import { BaseESLintRule } from '../BaseESLintRule.mts';
import { getChildIndent, getLine, getLineIndent, getSourceCode, getUnwrapMaxLen, getWrapMaxLen, isSingleLine } from '../utils.mts';

const defaultMaxLen = 100;

const splitMessage    = 'Ternary should be split over multiple lines when it exceeds the line limit';
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
		type : 'layout',
		docs : {
			description : 'Collapse or expand ternary expressions based on line length. See rule source for `maxLenBuffer` hysteresis.',
			category    : 'Stylistic Issues',
			recommended : false,
		},
		fixable : 'whitespace',
		schema  : [
			{
				type       : 'object',
				properties : {
					maxLen : {
						type    : 'integer',
						minimum : 1,
					},
					maxLenBuffer : {
						type    : 'integer',
						minimum : 0,
					},
				},
				additionalProperties : false,
			},
		],
	} as const;

	context: Rule.RuleContext;
	sourceCode: SourceCode;
	options: ResolvedMultilineTernaryOptions;

	constructor(context: Rule.RuleContext) {
		super();
		this.context    = context;
		this.sourceCode = getSourceCode(context);
		this.options    = Object.assign({
			maxLen       : defaultMaxLen,
			maxLenBuffer : 5,
		}, context.options[0] as MultilineTernaryOptions | undefined);
	}

	static create(context: Rule.RuleContext): Rule.RuleListener {
		const rule = new MultilineTernary(context);

		return {
			ConditionalExpression(node: ConditionalExpression) {
				rule.checkConditionalExpression(node as ConditionalExpressionWithParent);
			},
		};
	}

	checkConditionalExpression(node: ConditionalExpressionWithParent): void {
		if (!isEligibleTernary(node, this.sourceCode)) {
			return;
		}

		if (isSingleLine(node)) {
			this.checkSingleLineTernary(node);
			return;
		}

		this.checkMultiLineTernary(node);
	}

	checkSingleLineTernary(node: ConditionalExpression): void {
		const line = getLine(node, this.sourceCode);

		if (line.length <= this.getWrapMaxLen()) {
			return;
		}

		this.context.report({
			node,
			message : splitMessage,
			fix     : fixer => fixer.replaceText(node, getMultiLineTernaryText(node, this.sourceCode)),
		});
	}

	checkMultiLineTernary(node: ConditionalExpression): void {
		const replacement = getSingleLineTernaryText(node, this.sourceCode);
		const line        = getReplacementLine(node, replacement, this.sourceCode);

		if (line.length > this.getUnwrapMaxLen()) {
			return;
		}

		this.context.report({ node, message : collapseMessage, fix : fixer => fixer.replaceText(node, replacement) });
	}

	getWrapMaxLen(): number {
		const { maxLen, maxLenBuffer } = this.options;

		return getWrapMaxLen(maxLen, maxLenBuffer);
	}

	getUnwrapMaxLen(): number {
		const { maxLen, maxLenBuffer } = this.options;

		return getUnwrapMaxLen(maxLen, maxLenBuffer);
	}

}

interface MultilineTernaryOptions {
	/** Split single-line ternaries when the containing line exceeds this length. */
	maxLen?: number;
	/**
	 * Characters subtracted from `maxLen` when deciding whether to collapse a
	 * multiline ternary, and added when deciding whether to split. Default: `5`.
	 * Use `0` to disable.
	 */
	maxLenBuffer?: number;
}

interface ResolvedMultilineTernaryOptions {
	maxLen: number;
	maxLenBuffer: number;
}

interface ConditionalExpressionWithParent extends ConditionalExpression {
	parent: Node;
}

function isEligibleTernary(node: ConditionalExpressionWithParent, sourceCode: SourceCode): boolean {
	if (node.parent.type === 'ConditionalExpression') {
		return false;
	}

	if (!isCollapsibleOperand(node.test, sourceCode)
		|| !isCollapsibleOperand(node.consequent, sourceCode)
		|| !isCollapsibleOperand(node.alternate, sourceCode)) {
		return false;
	}

	return isCleanSpan(node.range![0], node.range![1], sourceCode);
}

function isCollapsibleOperand(node: Expression, sourceCode: SourceCode): boolean {
	return isSingleLine(node)
		&& !containsNestedTernary(node)
		&& _.isEmpty(sourceCode.getCommentsInside(node));
}

function containsNestedTernary(node: Expression): boolean {
	return node.type === 'ConditionalExpression'
		|| getChildExpressions(node).some(child => containsNestedTernary(child));
}

function getChildExpressions(node: Expression): Expression[] {
	if ((node as { type: string }).type === 'ParenthesizedExpression') {
		return [ (node as { expression: Expression }).expression ];
	}

	switch (node.type) {
		case 'ArrayExpression':
			return node.elements.filter((element): element is Expression => element != null && element.type !== 'SpreadElement');
		case 'ArrowFunctionExpression':
			return node.expression && node.body.type !== 'BlockStatement' ? [ node.body as Expression ] : [];
		case 'AssignmentExpression':
		case 'BinaryExpression':
		case 'LogicalExpression':
			return [ node.left as Expression, node.right ];
		case 'CallExpression':
		case 'NewExpression':
			return [
				node.callee as Expression,
				...node.arguments.filter((argument): argument is Expression => argument.type !== 'SpreadElement'),
			];
		case 'ChainExpression':
			return [ node.expression as Expression ];
		case 'MemberExpression':
			return [ node.object as Expression, ...(node.computed ? [ node.property as Expression ] : []) ];
		case 'SequenceExpression':
			return node.expressions;
		case 'TemplateLiteral':
			return node.expressions;
		case 'UnaryExpression':
		case 'UpdateExpression':
			return [ node.argument as Expression ];
		case 'YieldExpression':
			return node.argument ? [ node.argument as Expression ] : [];
		case 'AwaitExpression':
			return [ node.argument as Expression ];
		case 'TaggedTemplateExpression':
			return [ node.tag as Expression, node.quasi as unknown as Expression ];
		default:
			return [];
	}
}

function getSingleLineTernaryText(node: ConditionalExpression, sourceCode: SourceCode): string {
	const testText  = sourceCode.getText(node.test);
	const trueText  = sourceCode.getText(node.consequent);
	const falseText = sourceCode.getText(node.alternate);

	return `${testText} ? ${trueText} : ${falseText}`;
}

function getMultiLineTernaryText(node: ConditionalExpression, sourceCode: SourceCode): string {
	const baseIndent     = getLineIndent(node, sourceCode);
	const operatorIndent = getChildIndent(baseIndent);
	const testText       = sourceCode.getText(node.test);
	const trueText       = sourceCode.getText(node.consequent);
	const falseText      = sourceCode.getText(node.alternate);

	return `${testText}\n${operatorIndent}? ${trueText}\n${operatorIndent}: ${falseText}`;
}

function getReplacementLine(node: ConditionalExpression, replacement: string, sourceCode: SourceCode): string {
	const firstLine = sourceCode.lines[node.loc!.start.line - 1]!;
	const lastLine  = sourceCode.lines[node.loc!.end.line - 1]!;

	return firstLine.slice(0, node.loc!.start.column) + replacement + lastLine.slice(node.loc!.end.column);
}

function isCleanSpan(start: number, end: number, sourceCode: SourceCode): boolean {
	return sourceCode.getAllComments().every(comment => comment.range![1]! <= start || comment.range![0]! >= end);
}
