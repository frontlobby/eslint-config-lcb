import type { Rule, SourceCode } from 'eslint';
import type { AssignmentExpression, BlockStatement, ConditionalExpression, Expression, IfStatement, Node, Pattern, Statement } from 'estree';

import { BaseESLintRule }              from '../BaseESLintRule.mts';
import { getSourceCode, isSingleLine } from '../utils.mts';

const message = 'Prefer a ternary expression when the if/else fits within maxLen';

/**
 * Prefer ternary expressions for small if/else return and assignment patterns.
 */
export class PreferSmallTernary extends BaseESLintRule {

	static meta = {
		type : 'suggestion',
		docs : {
			description : 'Prefer ternary expressions for small if/else return and assignment patterns',
			category    : 'Stylistic Issues',
			recommended : false,
		},
		fixable : 'code',
		schema  : [
			{
				type       : 'object',
				properties : {
					maxLen : {
						type    : 'integer',
						minimum : 1,
					},
				},
				required             : [ 'maxLen' ],
				additionalProperties : false,
			},
		],
	} as const;

	context: Rule.RuleContext;
	sourceCode: SourceCode;
	maxLen: number;

	constructor(context: Rule.RuleContext) {
		super();
		this.context    = context;
		this.sourceCode = getSourceCode(context);
		this.maxLen     = (context.options[0] as PreferSmallTernaryOptions).maxLen;
	}

	static create(context: Rule.RuleContext): Rule.RuleListener {
		const preferSmallTernary = new PreferSmallTernary(context);

		return {
			IfStatement(node: IfStatement) {
				preferSmallTernary.checkIfStatement(node as IfStatementWithParent);
			},
		};
	}

	checkIfStatement(node: IfStatementWithParent): void {
		if (isElseIfBranch(node)) {
			return;
		}

		if (node.alternate) {
			this.tryIfElse(node);
			return;
		}

		return this.tryConsecutive(node);
	}

	tryIfElse(node: IfStatement): void {
		if (node.alternate!.type === 'IfStatement') {
			return;
		}

		const consequentBranch = getBlockBranchAction(node.consequent);
		const alternateBranch  = getBlockBranchAction(node.alternate!);

		if (!consequentBranch || !alternateBranch || !branchesMatch(consequentBranch, alternateBranch, this.sourceCode)) {
			return;
		}

		if (!isEligibleBranch(node.test, consequentBranch, alternateBranch, this.sourceCode)) {
			return;
		}

		const range       = node.range!;
		const replacement = buildReplacement(node.test, consequentBranch, alternateBranch, this.sourceCode);

		this.reportReplacement(node, range, replacement);
	}

	tryConsecutive(node: IfStatementWithParent): void {
		const { parent } = node;

		if (parent.type !== 'BlockStatement') {
			return;
		}

		const siblingIndex = getSiblingIndex(parent, node);

		if (siblingIndex === -1 || siblingIndex + 1 >= parent.body.length) {
			return;
		}

		const nextStatement    = parent.body[siblingIndex + 1]!;
		const consequentBranch = getBlockBranchAction(node.consequent);
		const alternateBranch  = getStatementBranchAction(nextStatement);

		if (!consequentBranch || !alternateBranch || !branchesMatch(consequentBranch, alternateBranch, this.sourceCode)) {
			return;
		}

		if (!isEligibleBranch(node.test, consequentBranch, alternateBranch, this.sourceCode)) {
			return;
		}

		const range       = [ node.range![0], nextStatement.range![1] ] as [number, number];
		const replacement = buildReplacement(node.test, consequentBranch, alternateBranch, this.sourceCode);

		this.reportReplacement(node, range, replacement);
	}

	reportReplacement(node: IfStatement, range: [number, number], replacement: string): void {
		if (!isCleanSpan(range[0], range[1], this.sourceCode)) {
			return;
		}

		const lineLength = getReplacementLineLength(node.loc!.start.line, node.loc!.start.column, replacement, this.sourceCode);

		if (lineLength >= this.maxLen) {
			return;
		}

		this.context.report({ node, message, fix : fixer => fixer.replaceTextRange(range, replacement) });
	}

}

interface PreferSmallTernaryOptions {
	maxLen: number;
}

interface ReturnBranch {
	type: 'return';
	value: Expression;
}

interface AssignBranch {
	type: 'assign';
	left: Pattern;
	value: Expression;
}

interface IfStatementWithParent extends IfStatement {
	parent: Node;
}

type BranchAction = ReturnBranch | AssignBranch;

function getBlockBodyStatement(blockOrStatement: Statement): Statement | null {
	if (blockOrStatement.type !== 'BlockStatement') {
		return null;
	}

	return blockOrStatement.body.length !== 1 ? null : blockOrStatement.body[0]!;
}

function getBlockBranchAction(branch: Statement): BranchAction | null {
	const statement = getBlockBodyStatement(branch);

	return !statement ? null : getStatementBranchAction(statement);
}

function getStatementBranchAction(statement: Statement): BranchAction | null {
	const returnArgument = getReturnArgument(statement);

	if (returnArgument) {
		return { type : 'return', value : returnArgument };
	}

	const assignment = getAssignmentFromStatement(statement);

	return assignment ? { type : 'assign', left : assignment.left, value : assignment.right } : null;
}

function getReturnArgument(statement: Statement | null | undefined): Expression | null {
	return !statement || statement.type !== 'ReturnStatement' || !statement.argument ? null : statement.argument;
}

function getAssignmentFromStatement(statement: Statement | null | undefined): AssignmentExpression | null {
	if (
		!statement
		|| statement.type !== 'ExpressionStatement'
		|| statement.expression.type !== 'AssignmentExpression'
		|| statement.expression.operator !== '='
	) {
		return null;
	}

	return statement.expression;
}

function branchesMatch(consequentBranch: BranchAction, alternateBranch: BranchAction, sourceCode: SourceCode): boolean {
	if (consequentBranch.type !== alternateBranch.type) {
		return false;
	}

	return consequentBranch.type === 'return' ? true : hasSameAssignmentTarget(consequentBranch.left, (alternateBranch as AssignBranch).left, sourceCode);
}

function hasSameAssignmentTarget(leftA: Pattern, leftB: Pattern, sourceCode: SourceCode): boolean {
	return sourceCode.getText(leftA) === sourceCode.getText(leftB);
}

function isEligibleBranch(test: Expression, consequentBranch: BranchAction, alternateBranch: BranchAction, sourceCode: SourceCode): boolean {
	if (!isSingleLine(test)) {
		return false;
	}

	if (!isSingleLine(consequentBranch.value) || !isSingleLine(alternateBranch.value)) {
		return false;
	}

	if (isNestedTernary(consequentBranch.value) || isNestedTernary(alternateBranch.value)) {
		return false;
	}

	return isCleanSpan(test.range![0], alternateBranch.value.range![1], sourceCode);
}

function isNestedTernary(node: Expression): node is ConditionalExpression {
	return node.type === 'ConditionalExpression';
}

function buildReplacement(test: Expression, consequentBranch: BranchAction, alternateBranch: BranchAction, sourceCode: SourceCode): string {
	const testText  = sourceCode.getText(test);
	const trueText  = sourceCode.getText(consequentBranch.value);
	const falseText = sourceCode.getText(alternateBranch.value);

	if (consequentBranch.type === 'return') {
		return `return ${testText} ? ${trueText} : ${falseText};`;
	}

	const leftText = sourceCode.getText(consequentBranch.left);
	return `${leftText} = ${testText} ? ${trueText} : ${falseText};`;
}

function getReplacementLineLength(startLine: number, startColumn: number, replacement: string, sourceCode: SourceCode): number {
	const firstLine = sourceCode.lines[startLine - 1]!;
	return firstLine.slice(0, startColumn).length + replacement.length;
}

function getSiblingIndex(block: BlockStatement, node: IfStatement): number {
	return block.body.findIndex(statement => statement === node);
}

function isCleanSpan(start: number, end: number, sourceCode: SourceCode): boolean {
	return sourceCode.getAllComments().every(comment => comment.range![1]! <= start || comment.range![0]! >= end);
}

function isElseIfBranch(node: IfStatementWithParent): boolean {
	return node.parent.type === 'IfStatement' && (node.parent as IfStatement).alternate === node;
}
