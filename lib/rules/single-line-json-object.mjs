/**
 * Collapse or expand object literals based on line length.
 */
import { getSourceCode } from '../utils.mjs';

const DEFAULT_MAX_LENGTH = 100;

export default {
	meta : {
		type : 'layout',
		docs : {
			description : 'Collapse or expand object literals based on line length',
			category    : 'Stylistic Issues',
			recommended : false,
		},
		fixable : 'whitespace',
		schema  : [
			{
				type       : 'object',
				properties : {
					maxLength : {
						type    : 'integer',
						minimum : 1,
					},
				},
				additionalProperties : false,
			},
		],
	},

	create(context) {
		const sourceCode = getSourceCode(context);
		const options    = Object.assign({
			maxLength : DEFAULT_MAX_LENGTH,
		}, context.options[0]);

		return {
			ObjectExpression(node) {
				if (
					isNestedObjectValue(node)
					|| !isCollapsibleObjectExpression(node, sourceCode)
				) {
					return;
				}

				if (isSingleLine(node)) {
					checkSingleLineObject(node, context, sourceCode, options.maxLength);
					return;
				}

				checkMultiLineObject(node, context, sourceCode, options.maxLength);
			},
		};
	},
};

function checkSingleLineObject(node, context, sourceCode, maxLength) {
	const line = getLine(node, sourceCode);

	if (line.length <= maxLength || isEmpty(node.properties)) {
		return;
	}

	context.report({
		node,
		message : 'Object should be split over multiple lines when it exceeds the line limit',
		fix    : fixer => fixer.replaceText(node, getMultiLineObjectText(node, sourceCode)),
	});
}

function checkMultiLineObject(node, context, sourceCode, maxLength) {
	const replacement = getSingleLineObjectText(node, sourceCode);
	const line        = getReplacementLine(node, replacement, sourceCode);

	if (line.length > maxLength) {
		return;
	}

	context.report({
		node,
		message : 'Object should be on a single line when it fits within the line limit',
		fix    : fixer => fixer.replaceText(node, replacement),
	});
}

function isSingleLine(node) {
	return node.loc.start.line === node.loc.end.line;
}

function isNestedObjectValue(node) {
	if (node.parent.type === 'ArrayExpression') {
		return true;
	}

	return node.parent.type === 'Property'
		&& node.parent.value === node
		&& node.parent.parent.type === 'ObjectExpression';
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
	if (isEmpty(node.properties)) {
		return '{}';
	}

	return `{ ${node.properties.map(property => getPropertyText(property, sourceCode)).join(', ')} }`;
}

function getMultiLineObjectText(node, sourceCode) {
	const baseIndent     = getLineIndent(node, sourceCode);
	const propertyIndent = `${baseIndent}\t`;
	const properties     = node.properties
		.map(property => `${propertyIndent}${getPropertyText(property, sourceCode)},`)
		.join('\n');

	return `{\n${properties}\n${baseIndent}}`;
}

function getPropertyText(property, sourceCode) {
	if (property.type === 'SpreadElement') {
		return sourceCode.getText(property);
	}

	if (property.shorthand) {
		return sourceCode.getText(property);
	}

	return `${getKeyText(property, sourceCode)} : ${getValueText(property.value, sourceCode)}`;
}

function getKeyText(property, sourceCode) {
	if (property.computed) {
		return `[${sourceCode.getText(property.key)}]`;
	}

	return sourceCode.getText(property.key);
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
		if (isEmpty(node.elements)) {
			return '[]';
		}

		return `[ ${node.elements.map(element => getValueText(element, sourceCode)).join(', ')} ]`;
	}

	return sourceCode.getText(node);
}

function getReplacementLine(node, replacement, sourceCode) {
	const firstLine = sourceCode.lines[node.loc.start.line - 1];
	const lastLine  = sourceCode.lines[node.loc.end.line - 1];

	return firstLine.slice(0, node.loc.start.column) + replacement + lastLine.slice(node.loc.end.column);
}

function getLine(node, sourceCode) {
	return sourceCode.lines[node.loc.start.line - 1];
}

function getLineIndent(node, sourceCode) {
	const line = getLine(node, sourceCode);

	return line.match(/^\s*/)[0];
}

function isEmpty(value) {
	return value == null || value.length === 0;
}
