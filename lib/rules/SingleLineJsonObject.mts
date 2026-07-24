import type { Rule, SourceCode } from 'eslint';
import type { Expression, Node, ObjectExpression, Property, SpreadElement } from 'estree';

import { BaseESLintRule } from '../BaseESLintRule.mts';
import { getLine, getLineIndent, getSourceCode, getUnwrapMaxLen, getWrapMaxLen, isSingleLine } from '../utils.mts';

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
		type : 'layout',
		docs : {
			description : 'Collapse or expand object literals based on line length. See rule source for `maxLenBuffer` hysteresis.',
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
	options: ResolvedSingleLineJsonObjectOptions;

	constructor(context: Rule.RuleContext) {
		super();
		this.context    = context;
		this.sourceCode = getSourceCode(context);
		this.options    = Object.assign({
			maxLen       : defaultMaxLen,
			maxLenBuffer : 5,
		}, context.options[0] as SingleLineJsonObjectOptions | undefined);
	}

	static create(context: Rule.RuleContext): Rule.RuleListener {
		const rule = new SingleLineJsonObject(context);

		return {
			ObjectExpression(node: ObjectExpression) {
				rule.checkObjectExpression(node as ObjectExpressionWithParent);
			},
		};
	}

	checkObjectExpression(node: ObjectExpressionWithParent): void {
		if (
			isNestedObjectValue(node)
			|| !isCollapsibleObjectExpression(node, this.sourceCode)
		) {
			return;
		}

		if (isSingleLine(node)) {
			this.checkSingleLineObject(node);
			return;
		}

		this.checkMultiLineObject(node);
	}

	checkSingleLineObject(node: ObjectExpressionWithParent): void {
		const line = getLine(node, this.sourceCode);

		if (line.length <= this.getWrapMaxLen() || isEmpty(node.properties)) {
			return;
		}

		this.context.report({
			node,
			message : 'Object should be split over multiple lines when it exceeds the line limit',
			fix     : fixer => fixer.replaceText(node, getMultiLineObjectText(node, this.sourceCode)),
		});
	}

	checkMultiLineObject(node: ObjectExpressionWithParent): void {
		const replacement = getSingleLineObjectText(node, this.sourceCode);
		const line        = getReplacementLine(node, replacement, this.sourceCode);

		if (line.length > this.getUnwrapMaxLen()) {
			return;
		}

		this.context.report({
			node,
			message : 'Object should be on a single line when it fits within the line limit',
			fix     : fixer => fixer.replaceText(node, replacement),
		});
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

interface SingleLineJsonObjectOptions {
	/** Split single-line objects when the containing line exceeds this length. */
	maxLen?: number;
	/**
	 * Characters subtracted from `maxLen` when deciding whether to collapse a
	 * multiline object, and added when deciding whether to split. Default: `5`.
	 * Use `0` to disable.
	 */
	maxLenBuffer?: number;
}

interface ResolvedSingleLineJsonObjectOptions {
	maxLen: number;
	maxLenBuffer: number;
}

interface ObjectExpressionWithParent extends ObjectExpression {
	parent: Node & { parent?: Node };
}

type ObjectProperty = Property | SpreadElement;

function isNestedObjectValue(node: ObjectExpressionWithParent): boolean {
	if (node.parent.type === 'ArrayExpression') {
		return true;
	}

	return node.parent.type === 'Property'
		&& (node.parent as Property).value === node
		&& node.parent.parent?.type === 'ObjectExpression';
}

function isCollapsibleObjectExpression(node: ObjectExpression, sourceCode: SourceCode): boolean {
	return node.type === 'ObjectExpression'
		&& isEmpty(sourceCode.getCommentsInside(node))
		&& node.properties.every(property => isCollapsibleProperty(property, sourceCode));
}

function isCollapsibleProperty(property: ObjectProperty, sourceCode: SourceCode): boolean {
	if (property.type === 'SpreadElement') {
		return isSingleLine(property.argument);
	}

	return property.type === 'Property'
		&& property.kind === 'init'
		&& property.method === false
		&& isSingleLine(property.key)
		&& isCollapsibleValue(property.value as Expression, sourceCode);
}

function getSingleLineObjectText(node: ObjectExpression, sourceCode: SourceCode): string {
	return isEmpty(node.properties) ? '{}' : `{ ${node.properties.map(property => getPropertyText(property, sourceCode)).join(', ')} }`;
}

function getMultiLineObjectText(node: ObjectExpression, sourceCode: SourceCode): string {
	const baseIndent     = getLineIndent(node, sourceCode);
	const propertyIndent = `${baseIndent}\t`;
	const properties     = node.properties
		.map(property => `${propertyIndent}${getPropertyText(property, sourceCode)},`)
		.join('\n');

	return `{\n${properties}\n${baseIndent}}`;
}

function getPropertyText(property: ObjectProperty, sourceCode: SourceCode): string {
	if (property.type === 'SpreadElement') {
		return sourceCode.getText(property);
	}

	return property.shorthand ? sourceCode.getText(property) : `${getKeyText(property, sourceCode)} : ${getValueText(property.value as Expression, sourceCode)}`;
}

function getKeyText(property: Property, sourceCode: SourceCode): string {
	return property.computed ? `[${sourceCode.getText(property.key)}]` : sourceCode.getText(property.key);
}

function isCollapsibleValue(node: Expression | SpreadElement, sourceCode: SourceCode): boolean {
	if (node.type === 'ObjectExpression') {
		return isCollapsibleObjectExpression(node, sourceCode);
	}

	if (node.type === 'ArrayExpression') {
		return isEmpty(sourceCode.getCommentsInside(node))
			&& node.elements.every(element => element && isCollapsibleValue(element, sourceCode));
	}

	return isSingleLine(node);
}

function getValueText(node: Expression | SpreadElement, sourceCode: SourceCode): string {
	if (node.type === 'ObjectExpression') {
		return getSingleLineObjectText(node, sourceCode);
	}

	if (node.type === 'ArrayExpression') {
		return isEmpty(node.elements) ? '[]' : `[ ${node.elements.map(element => getValueText(element!, sourceCode)).join(', ')} ]`;
	}

	return sourceCode.getText(node);
}

function getReplacementLine(node: ObjectExpression, replacement: string, sourceCode: SourceCode): string {
	const firstLine = sourceCode.lines[node.loc!.start.line - 1]!;
	const lastLine  = sourceCode.lines[node.loc!.end.line - 1]!;

	return firstLine.slice(0, node.loc!.start.column) + replacement + lastLine.slice(node.loc!.end.column);
}

function isEmpty<T>(value: T[] | null | undefined): value is [] | null | undefined {
	return value == null || value.length === 0;
}
