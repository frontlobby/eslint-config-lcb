/**
 * Align assignment statements on their equals signs.
 */
'use strict';

const { hasPropsWithValues } = require('../utils');

const DEFAULT_MAX_SPACES = 25;
// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
	meta : {
		docs : {
			description : 'Align assignment statements on their equals signs',
			category    : 'Best Practices',
			recommended : false,
		},
		fixable : 'code',
	},

	create : function(context) {
		const maxSpaces = context.options && context.options[0] && context.options[0].maxSpaces || DEFAULT_MAX_SPACES;

		return {
			BlockStatement : checkFunction,
			Program        : checkFunction,
		};

		function checkFunction(node) {
			// Make blocks out of statements that could be aligned
			const alignBlocks = [];
			let blockEnd      = null;
			const sourceCode  = context.getSourceCode();
			node.body.forEach((childNode, index) => {
				if (
				// Make sure the node actually an assignment
					(
						(childNode.type === 'VariableDeclaration' && childNode.declarations.some(decl => decl.init !== null))
						|| hasPropsWithValues(childNode, { 'type' : 'ExpressionStatement', 'expression.type' : 'AssignmentExpression' })
					)

					// Make sure node is not on the same line that the block starts on
					&& (node.type !== 'BlockStatement' || node.loc.start.line !== childNode.loc.start.line)

					// Make sure node is on its own line
					&& (index + 1 >= node.body.length || node.body[index + 1].loc.start.line > childNode.loc.end.line)
					&& (index - 1 < 0 || node.body[index - 1].loc.end.line < childNode.loc.start.line)

					// Make sure there are no comments before the node on the same line as the node
					&& (sourceCode.getCommentsBefore(childNode).every(comment => comment.loc.end.line !== childNode.loc.start.line))
				) {
					const text           = sourceCode.getText(childNode);
					const equalsPos      = indexOfEquals(childNode, text);
					const indexOfNewline = text.indexOf('\n');
					// Make sure that the equals sign is on the first line of the node
					if (equalsPos !== -1 && (indexOfNewline === -1 || equalsPos < indexOfNewline)) {
						// If this node is right after the previous one, it should be aligned in the same block
						// so push it into the last align block in the list
						if (blockEnd !== null && childNode.loc.start.line === blockEnd + 1) {
							alignBlocks[alignBlocks.length - 1].push(childNode);
						}
						// Otherwise it is time to start a new block!
						else {
							alignBlocks.push([ childNode ]);
						}
						blockEnd = childNode.loc.start.line;
					}
				}
			});

			// Figure out where the equals sign should go
			const alignBlockEqualsPositions = [];
			for (let blockIndex = 0; blockIndex < alignBlocks.length; blockIndex++) {
				const block = alignBlocks[blockIndex];

				let prevEqualsPosition;
				let maxEqualsPosition = 0;
				let maxOperatorLength = 0;
				for (let nodeIndex = 0; nodeIndex < block.length; nodeIndex++) {
					const blockNode = block[nodeIndex];

					let equalsPosition;
					let operatorLength;
					if (blockNode.type === 'VariableDeclaration') {
						// Find the first declaration that has an equals sign
						// Useful in cases like:
						/*
							let a, b = 3, c, d, e = 5;
						*/
						const tokenBeforeEquals = blockNode.declarations.find(decl => decl.init !== null).id;
						equalsPosition          = tokenBeforeEquals.loc.end.column;
						operatorLength          = 1;
					}
					else {
						equalsPosition = blockNode.expression.left.loc.end.column;
						operatorLength = blockNode.expression.operator.length;
					}

					// if this node needs too many or too few spaces, make a new block for it
					if (
						prevEqualsPosition
						&& (equalsPosition > prevEqualsPosition + maxSpaces || equalsPosition < prevEqualsPosition - maxSpaces)
					) {
						alignBlocks.splice(blockIndex + 1, 0, block.splice(nodeIndex));
						break;
					}

					prevEqualsPosition = equalsPosition;
					maxOperatorLength  = Math.max(maxOperatorLength, operatorLength);
					maxEqualsPosition  = Math.max(maxEqualsPosition, equalsPosition);
				}

				alignBlockEqualsPositions[blockIndex] = maxEqualsPosition + maxOperatorLength;
			}

			// Make sure all the equals signs are in the right places
			alignBlocks.forEach((block, index) => {
				const equalsPosition = alignBlockEqualsPositions[index];
				block.forEach(blockNode => {
					const currentEqualsPos = indexOfEquals(blockNode, sourceCode.getText(blockNode)) + blockNode.loc.start.column;
					const numSpacesNeeded  = equalsPosition - currentEqualsPos;
					if (numSpacesNeeded !== 0) {
						const operatorLength = blockNode.type === 'VariableDeclaration' ? 1 : blockNode.expression.operator.length;
						context.report({
							node,
							loc : {
								start : {
									line   : blockNode.loc.start.line,
									column : currentEqualsPos - operatorLength + 1,
								},
								end : {
									line   : blockNode.loc.start.line,
									column : currentEqualsPos + 1,
								},
							},
							message : 'Assignments should be aligned',
							fix(fixer) {
								let tokenBeforeEquals = null;
								if (blockNode.type === 'VariableDeclaration') {
									tokenBeforeEquals = blockNode.declarations.find(decl => decl.init !== null).id;
								}
								else {
									tokenBeforeEquals = blockNode.expression.left;
								}
								if (numSpacesNeeded > 0) {
									return fixer.insertTextAfter(tokenBeforeEquals, [ ...new Array(numSpacesNeeded + 1) ].join(' '));
								}
								return fixer.removeRange([ tokenBeforeEquals.end, tokenBeforeEquals.end - numSpacesNeeded ]);
							},
						});
					}
				});
			});
		}
	},
};

/**
 * Find the first index on the first line of an equals sign that is part of the assignment statement
 * (as opposed to part of something else, like a sub-statement)
 * eg, in the line
 * 	a[b = 'asdf'] = 3;
 * we want the second equals sign
 * @param {ASTNode} node
 * @param {String}  text - The sourcecode of the node
 */
function indexOfEquals(node, text) {
	if (node.type === 'ExpressionStatement') {
		if (node.loc.start.line === node.expression.left.loc.end.line) {
			return text.indexOf('=', node.expression.left.loc.end.column - node.loc.start.column);
		}
		return -1;
	}
	return text.indexOf('=');
}
