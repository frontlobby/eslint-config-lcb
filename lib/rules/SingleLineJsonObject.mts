import type { Rule, SourceCode } from 'eslint';
import type { Expression, Node, ObjectExpression, Property, SpreadElement } from 'estree';
import _                         from 'lodash';

import { BaseESLintRule } from '../BaseESLintRule.mts';
import {
	getChildIndent, getLine, getLineIndent, getReplacementLine, getUnwrapMaxLen, getWrapMaxLen, isSingleLine, maxLenSchema
} from '../utils.mts';

const defaultMaxLen = 100;

/**
 * Collapse or expand object literals based on line length.
 *
 * `maxLen` and `maxLenBuffer` work as described on getWrapMaxLen in `lib/utils.mts`.
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
				type                 : 'object',
				properties           : { ...maxLenSchema },
				additionalProperties : false,
			},
		],
	} as const;

	options: ResolvedSingleLineJsonObjectOptions;

	constructor(context: Rule.RuleContext) {
		super(context);

		this.options = Object.assign({
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
		if (line.length <= getWrapMaxLen(this.options) || _.isEmpty(node.properties)) {
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
		if (line.length > getUnwrapMaxLen(this.options)) {
			return;
		}

		this.context.report({
			node,
			message : 'Object should be on a single line when it fits within the line limit',
			fix     : fixer => fixer.replaceText(node, replacement),
		});
	}

}

interface SingleLineJsonObjectOptions {
	/** Split single-line objects when the containing line exceeds this length. */
	maxLen?       : number;
	maxLenBuffer? : number;
}

interface ResolvedSingleLineJsonObjectOptions {
	maxLen       : number;
	maxLenBuffer : number;
}

interface ObjectExpressionWithParent extends ObjectExpression {
	parent : Node & { parent?: Node };
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
		&& _.isEmpty(sourceCode.getCommentsInside(node))
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
	return _.isEmpty(node.properties) ? '{}' : `{ ${node.properties.map(property => getPropertyText(property, sourceCode)).join(', ')} }`;
}

function getMultiLineObjectText(node: ObjectExpression, sourceCode: SourceCode): string {
	const baseIndent     = getLineIndent(node, sourceCode);
	const propertyIndent = getChildIndent(baseIndent);

	const properties = node.properties
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
		return _.isEmpty(sourceCode.getCommentsInside(node))
			&& node.elements.every(element => element && isCollapsibleValue(element, sourceCode));
	}

	return isSingleLine(node);
}

function getValueText(node: Expression | SpreadElement, sourceCode: SourceCode): string {
	if (node.type === 'ObjectExpression') {
		return getSingleLineObjectText(node, sourceCode);
	}

	if (node.type === 'ArrayExpression') {
		return _.isEmpty(node.elements) ? '[]' : `[ ${node.elements.map(element => getValueText(element!, sourceCode)).join(', ')} ]`;
	}
	return sourceCode.getText(node);
}
