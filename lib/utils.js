'use strict';

const _ = require('lodash');

/**
 * Checks if the given node contains properties that have certain values
 *
 * @param {Object} node       - the node whose properties need to be looked up
 * @param {Object} attributes - Object whose keys correspond to the path of the property to look up & value is used for comparison
 * @returns {Boolean} true if all paths resolve with values that were passed in. Otherwise, returns false
 */
function hasPropsWithValues(node, attributes) {
	if (!node) {
		return false;
	}

	if (_.isEmpty(attributes)) {
		return true;
	}

	return _.every(attributes, (val, key) => _.get(node, key) === attributes[key]);
}

function isNodeAnIdentifierWithName(node, subNode, name) {
	return hasPropsWithValues(node, { [`${subNode}.type`] : 'Identifier', [`${subNode}.name`] : name });
}

function isPropertyAnIdentifierWithName(node, name) {
	return isNodeAnIdentifierWithName(node, 'property', name);
}

function isObjectAnIdentifierWithName(node, name) {
	return isNodeAnIdentifierWithName(node, 'object', name);
}

function isUnaryExpression(scope, operator) {
	return scope.parent.type === 'UnaryExpression' && scope.parent.operator === operator;
}

/**
 * Checks if the given node is a require statement function call with a single argument of type literal
 * This function will return true for the following statement
 * require('account')
 *
 * This function will return false for the following statement
 * require([ 'account' ], account => .....)
 *
 * @param {ASTNode} node - the node whose properties need to be looked up
 * @returns {Boolean} true if it is a require function call with a single argument literal. Otherwise, returns false
 */
function isRequireCallLiteral(node) {
	return node
		&& node.type === 'CallExpression'
		&& isNodeAnIdentifierWithName(node, 'callee', 'require')
		&& node.arguments.length === 1
		&& node.arguments[0].type === 'Literal';
}

/**
 * Checks if the given node is a require statement function call with an array as its first argument
 * This function will return true for the following statement
 * require([ 'account' ], account => .....)
 *
 * This function will return false for the following statement
 * require('account')
 *
 * @param {ASTNode} node - the node whose properties need to be looked up
 * @returns {Boolean} true if it is a require function call with a single argument literal. Otherwise, returns false
 */
function isRequireCallArrayExpression(node) {
	return node
		&& node.type === 'CallExpression'
		&& isNodeAnIdentifierWithName(node, 'callee', 'require')
		&& node.arguments.length > 0
		&& node.arguments[0].type === 'ArrayExpression';
}

/**
 * Checks if the given node is a require statement
 * @param {ASTNode} node  - the node whose properties need to be looked up
 */
function isRequireCall(node) {
	return isRequireCallLiteral(node) || isRequireCallArrayExpression(node);
}

/**
 * Given a node that corresponds with a require call, this function will return the type of require call & the names of all modules being required
 * @param {ASTNode} node - The node whose properties need to be looked up
 * @returns {ASTNode[]} - An array of nodes for all the literal arguments passed into the require call
 */
function getLiteralModuleNamesFromRequireCall(node) {
	if (!isRequireCall(node)) {
		return [];
	}

	const isLiteralRequire = isRequireCallLiteral(node);
	const args             = isLiteralRequire ? node.arguments : node.arguments[0].elements;

	return _.filter(args, arg => arg.type === 'Literal');
}

/**
 * node : The node on which lint rule has fired. (MemberExpression)
 * context : context object
 * type : the type of fix to apply ('null' or 'undefined')
 * fixer : the fixer object which has helper methods to apply code fixes
 */
function lodashAutofix(node, context, type, fixer) {
	/**
	 * node is MemberExpression (_.isNull or _.isUndefined)
	 * node.parent is CallExpression (_.isNull() or _.isUndefined())
	 */

	// The scope to which auto fix will be applied. Most of the times, this will be the call expression
	// unless it's preceded by UnaryExpression(s)
	let scope = node.parent;

	// If initial scope isn't a call expression something isn't right.
	// Shouldn't happen but let's be defensive
	// Also, if more than one argument was passed to isNull then don't attempt to autofix
	if (scope.type !== 'CallExpression' || scope.arguments.length > 1) {
		return;
	}

	// Grab the argument that was passed to the isNull function
	const arg  = scope.arguments[0];
	let negate = false;

	// Call expression's parent influences the way autofixing works.
	// If it is a UnaryExpression with operator ! then our fix has to check for inequality
	// Unless it is preceded by another ! operator
	if (isUnaryExpression(scope, '!')) {
		negate = !negate;
		scope  = scope.parent;
	}

	if (isUnaryExpression(scope, '!')) {
		negate = !negate;
		scope  = scope.parent;
	}

	const fixToAppend = negate ? ` !== ${type}` : ` === ${type}`;

	// Get an instance of `SourceCode` so we can convert the argument to source code
	// & append the fix to it
	const sourceCode = context.getSourceCode();
	let fixedCode    = sourceCode.getText(arg) + fixToAppend;

	// If the scope's parent is a BinaryExpression (eg ===)
	// then wrap the fixedCode in brackets to avoid inadvertently changing the result
	// Eg: We don't want to turn `testVar === _.isNull(5)` to `testVar === 5 === null`
	// It should be turned into `testVar === (5 === null)`
	if (scope.parent.type === 'BinaryExpression') {
		fixedCode = `(${fixedCode})`;
	}

	return fixer.replaceText(scope, fixedCode);
}

module.exports = {
	lodashAutofix,
	hasPropsWithValues,
	isPropertyAnIdentifierWithName,
	isObjectAnIdentifierWithName,
	isRequireCall,
	isRequireCallLiteral,
	isRequireCallArrayExpression,
	getLiteralModuleNamesFromRequireCall,
};
