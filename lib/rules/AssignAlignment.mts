import type { Rule, SourceCode } from 'eslint';
import type { AssignmentExpression, BlockStatement, ExpressionStatement, Node, Program, VariableDeclaration } from 'estree';

import { BaseESLintRule }                    from '../BaseESLintRule.mts';
import { getSourceCode, hasPropsWithValues } from '../utils.mts';

const messageAlign = 'Assignments should be aligned';

/**
 * Align assignment statements on their equals signs.
 */
export class AssignAlignment extends BaseESLintRule {

	static meta = {
		type : 'layout',
		docs : {
			description : 'Align assignment statements on their equals signs',
			category    : 'Best Practices',
			recommended : false,
		},
		fixable : 'code',
		schema  : [
			{
				type       : 'object',
				properties : {
					maxSpaces : {
						type : 'number',
					},
				},
				additionalProperties : false,
			},
		],
	} as const;

	context: Rule.RuleContext;
	sourceCode: SourceCode;
	options: ResolvedAlignAssignOptions;

	constructor(context: Rule.RuleContext) {
		super();
		this.context    = context;
		this.sourceCode = getSourceCode(context);
		this.options    = Object.assign({ maxSpaces : 25 }, context.options[0] as AlignAssignOptions | undefined);
	}

	static create(context: Rule.RuleContext): Rule.RuleListener {
		const assignAlignment = new AssignAlignment(context);

		return {
			BlockStatement(node: BlockStatement) {
				assignAlignment.checkNode(node);
			},
			Program(node: Program) {
				assignAlignment.checkNode(node);
			},
		};
	}

	checkNode(node: AlignableParent): void {
		const alignBlocks               = this.buildAlignBlocks(node);
		const alignBlockEqualsPositions = this.computeAlignPositions(alignBlocks);

		this.reportMisalignments(node, alignBlocks, alignBlockEqualsPositions);
	}

	buildAlignBlocks(node: AlignableParent): AlignableAssignment[][] {
		const alignBlocks: AlignableAssignment[][] = [];
		let blockEnd: number | null                = null;

		node.body.forEach((childNode, index) => {
			if (!this.isAlignableChild(node, childNode, index)) {
				return;
			}

			const text           = this.sourceCode.getText(childNode);
			const equalsPos      = indexOfEquals(childNode as AlignableAssignment, text);
			const indexOfNewline = text.indexOf('\n');

			if (equalsPos === -1 || (indexOfNewline !== -1 && equalsPos >= indexOfNewline)) {
				return;
			}

			if (blockEnd !== null && childNode.loc!.start.line === blockEnd + 1) {
				alignBlocks[alignBlocks.length - 1]!.push(childNode as AlignableAssignment);
			}
			else {
				alignBlocks.push([ childNode as AlignableAssignment ]);
			}

			blockEnd = childNode.loc!.start.line;
		});

		return alignBlocks;
	}

	isAlignableChild(node: AlignableParent, childNode: AlignableParentBodyElement, index: number): childNode is AlignableAssignment {
		const isAssignment = (
			(childNode.type === 'VariableDeclaration' && childNode.declarations.some(decl => decl.init !== null))
			 || hasPropsWithValues(childNode, { 'type' : 'ExpressionStatement', 'expression.type' : 'AssignmentExpression' })
		);

		if (!isAssignment) {
			return false;
		}

		if (node.type === 'BlockStatement' && node.loc!.start.line === childNode.loc!.start.line) {
			return false;
		}

		if (index + 1 < node.body.length && node.body[index + 1]!.loc!.start.line <= childNode.loc!.end.line) {
			return false;
		}

		if (index - 1 >= 0 && node.body[index - 1]!.loc!.end.line >= childNode.loc!.start.line) {
			return false;
		}

		return this.sourceCode.getCommentsBefore(childNode).every(comment => comment.loc!.end.line !== childNode.loc!.start.line);
	}

	computeAlignPositions(alignBlocks: AlignableAssignment[][]): number[] {
		const alignBlockEqualsPositions: number[] = [];

		for (let blockIndex = 0; blockIndex < alignBlocks.length; blockIndex++) {
			const block = alignBlocks[blockIndex]!;

			let prevEqualsPosition: number | undefined;
			let maxEqualsPosition = 0;
			let maxOperatorLength = 0;

			for (let nodeIndex = 0; nodeIndex < block.length; nodeIndex++) {
				const blockNode                          = block[nodeIndex]!;
				const { equalsPosition, operatorLength } = this.getAssignmentEqualsInfo(blockNode);

				if (
					prevEqualsPosition !== undefined
					 && (equalsPosition > prevEqualsPosition + this.options.maxSpaces || equalsPosition < prevEqualsPosition - this.options.maxSpaces)
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

		return alignBlockEqualsPositions;
	}

	getAssignmentEqualsInfo(blockNode: AlignableAssignment): AssignmentEqualsInfo {
		if (blockNode.type === 'VariableDeclaration') {
			const tokenBeforeEquals = blockNode.declarations.find(decl => decl.init !== null)!.id;

			return { equalsPosition : tokenBeforeEquals.loc!.end.column, operatorLength : 1 };
		}

		return { equalsPosition : blockNode.expression.left.loc!.end.column, operatorLength : blockNode.expression.operator.length };
	}

	reportMisalignments(node: AlignableParent, alignBlocks: AlignableAssignment[][], alignBlockEqualsPositions: number[]): void {
		alignBlocks.forEach((block, index) => {
			const equalsPosition = alignBlockEqualsPositions[index]!;

			block.forEach(blockNode => {
				const currentEqualsPos = indexOfEquals(blockNode, this.sourceCode.getText(blockNode)) + blockNode.loc!.start.column;
				const numSpacesNeeded  = equalsPosition - currentEqualsPos;

				if (numSpacesNeeded === 0) {
					return;
				}

				this.reportMisalignedAssignment(node, blockNode, currentEqualsPos, numSpacesNeeded);
			});
		});
	}

	reportMisalignedAssignment(node: AlignableParent, blockNode: AlignableAssignment, currentEqualsPos: number, numSpacesNeeded: number): void {
		const operatorLength = blockNode.type === 'VariableDeclaration' ? 1 : blockNode.expression.operator.length;

		this.context.report({
			message : messageAlign,
			node,
			loc     : {
				start : {
					line   : blockNode.loc!.start.line,
					column : currentEqualsPos - operatorLength + 1,
				},
				end : {
					line   : blockNode.loc!.start.line,
					column : currentEqualsPos + 1,
				},
			},
			fix : fixer => this.getAssignmentSpacingFix(blockNode, numSpacesNeeded, fixer),
		});
	}

	getAssignmentSpacingFix(blockNode: AlignableAssignment, numSpacesNeeded: number, fixer: Rule.RuleFixer): Rule.Fix {
		const tokenBeforeEquals = this.getTokenBeforeEquals(blockNode);

		if (numSpacesNeeded > 0) {
			return fixer.insertTextAfter(tokenBeforeEquals, [ ...new Array(numSpacesNeeded + 1) ].join(' '));
		}

		return fixer.removeRange([ tokenBeforeEquals.range![1]!, tokenBeforeEquals.range![1]! - numSpacesNeeded ]);
	}

	getTokenBeforeEquals(blockNode: AlignableAssignment): Node {
		return blockNode.type === 'VariableDeclaration' ? blockNode.declarations.find(decl => decl.init !== null)!.id : blockNode.expression.left;
	}

}

interface AlignAssignOptions {
	maxSpaces?: number;
}

interface ResolvedAlignAssignOptions {
	maxSpaces: number;
}

interface AssignmentEqualsInfo {
	equalsPosition: number;
	operatorLength: number;
}

type AlignableParent = BlockStatement | Program;

type AlignableParentBodyElement = AlignableParent['body'][number];

type AlignableAssignment = VariableDeclaration | (ExpressionStatement & { expression: AssignmentExpression });

/**
 * Find the first index on the first line of an equals sign that is part of the assignment statement
 * (as opposed to part of something else, like a sub-statement)
 * eg, in the line
 * 	a[b = 'asdf'] = 3;
 * we want the second equals sign
 */
function indexOfEquals(node: AlignableAssignment, text: string): number {
	if (node.type === 'ExpressionStatement') {
		if (node.loc!.start.line === node.expression.left.loc!.end.line) {
			return text.indexOf('=', node.expression.left.loc!.end.column - node.loc!.start.column);
		}
		return -1;
	}
	return text.indexOf('=');
}
