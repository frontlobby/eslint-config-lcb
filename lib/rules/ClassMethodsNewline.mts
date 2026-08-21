import type { Rule, SourceCode } from 'eslint';
import type { Node }             from 'estree';

import { BaseESLintRule } from '../BaseESLintRule.mts';
import { getSourceCode }  from '../utils.mts';

const memberMessage       = 'Class methods should be separated by exactly one blank line';
const closingBraceMessage = 'The final class method should be followed by exactly one blank line';
const getterSetterMessage = 'A getter and its setter should not be separated by a blank line';

type ClassBody = Node & { body: Node[] };
type MethodLike = Node & {
	kind?: string;
	key?: Node;
	static?: boolean;
};

/**
 * Require exactly one blank line between consecutive class methods and after
 * a class's final method.
 *
 * Getters, setters, constructors, and static methods are all represented by
 * `MethodDefinition` nodes, so they follow the same spacing requirement.
 */
export class ClassMethodsNewline extends BaseESLintRule {

	static meta = {
		type : 'layout',
		docs : {
			description : 'Require exactly one blank line between consecutive class methods',
			category    : 'Stylistic Issues',
			recommended : false,
		},
		fixable : 'whitespace',
		schema  : [],
	} as const;

	context: Rule.RuleContext;
	sourceCode: SourceCode;

	constructor(context: Rule.RuleContext) {
		super();
		this.context    = context;
		this.sourceCode = getSourceCode(context);
	}

	static create(context: Rule.RuleContext): Rule.RuleListener {
		const rule = new ClassMethodsNewline(context);

		return {
			ClassBody(node: Node) {
				rule.checkClassBody(node as ClassBody);
			},
		};
	}

	checkClassBody(classBody: ClassBody): void {
		for (let index = 1; index < classBody.body.length; index++) {
			const previousMember = classBody.body[index - 1]!;
			const currentMember  = classBody.body[index]!;

			if (!isMethodLike(previousMember) || !isMethodLike(currentMember)) {
				continue;
			}

			if (hasCommentsBetweenMembers(previousMember, currentMember, this.sourceCode)) {
				this.checkCommentMemberGap(previousMember, currentMember);
				continue;
			}

			if (isGetterSetterPair(previousMember, currentMember, this.sourceCode)) {
				this.checkGetterSetterGap(previousMember, currentMember);
				continue;
			}

			this.checkMemberGap(previousMember, currentMember);
		}

		const finalMember = classBody.body.at(-1);

		if (finalMember && isMethodLike(finalMember)) {
			if (hasCommentsAfterMember(finalMember, classBody, this.sourceCode)) {
				this.checkCommentFinalGap(finalMember, classBody);
			}
			else {
				this.checkFinalMemberGap(finalMember, classBody);
			}
		}
	}

	checkMemberGap(previousMember: Node, currentMember: Node): void {
		const blankLineCount = getBlankLineCount(previousMember, currentMember, this.sourceCode);

		if (blankLineCount === 1) {
			return;
		}

		const gapRange: [ number, number ] = [ previousMember.range![1], getMemberStartRange(currentMember, this.sourceCode) ];
		const hasComments                  = this.sourceCode.getAllComments().some(comment =>
			comment.range![0] >= gapRange[0] && comment.range![1] <= gapRange[1]);

		this.context.report({
			node    : currentMember,
			message : memberMessage,
			...(hasComments ? {} : {
				fix : fixer => fixer.replaceTextRange(gapRange, getRequiredGap(currentMember, this.sourceCode)),
			}),
		});
	}

	checkGetterSetterGap(getter: Node, setter: Node): void {
		const blankLineCount = getBlankLineCount(getter, setter, this.sourceCode);

		if (blankLineCount === 0) {
			return;
		}

		const gapRange: [ number, number ] = [ getter.range![1], getMemberStartRange(setter, this.sourceCode) ];
		const hasComments                  = this.sourceCode.getAllComments().some(comment =>
			comment.range![0] >= gapRange[0] && comment.range![1] <= gapRange[1]);

		this.context.report({
			node    : setter,
			message : getterSetterMessage,
			...(hasComments ? {} : { fix : fixer => fixer.replaceTextRange(gapRange, getDirectGap(setter, this.sourceCode)) }),
		});
	}

	checkCommentMemberGap(previousMember: Node, currentMember: Node): void {
		const gapRange: [ number, number ] = [ previousMember.range![1], getMemberStartRange(currentMember, this.sourceCode) ];

		this.reportExcessCommentBlankLines(currentMember, gapRange, memberMessage);
	}

	checkCommentFinalGap(finalMember: Node, classBody: ClassBody): void {
		const gapRange: [ number, number ] = [ finalMember.range![1], classBody.range![1] - 1 ];

		this.reportExcessCommentBlankLines(finalMember, gapRange, closingBraceMessage);
	}

	reportExcessCommentBlankLines(node: Node, gapRange: [ number, number ], message: string): void {
		const gap          = this.sourceCode.text.slice(...gapRange);
		const collapsedGap = collapseExcessBlankLines(gap);

		if (gap === collapsedGap) {
			return;
		}

		this.context.report({
			node,
			message,
			fix : fixer => fixer.replaceTextRange(gapRange, collapsedGap),
		});
	}

	checkFinalMemberGap(finalMember: Node, classBody: ClassBody): void {
		const blankLineCount = getBlankLineCountAfterMember(finalMember, classBody, this.sourceCode);

		if (blankLineCount === 1) {
			return;
		}

		const gapRange: [ number, number ] = [ finalMember.range![1], classBody.range![1] - 1 ];
		const hasComments                  = this.sourceCode.getAllComments().some(comment =>
			comment.range![0] >= gapRange[0] && comment.range![1] <= gapRange[1]);

		this.context.report({
			node    : finalMember,
			message : closingBraceMessage,
			...(hasComments ? {} : {
				fix : fixer => fixer.replaceTextRange(gapRange, getRequiredGapBeforeClosingBrace(classBody, this.sourceCode)),
			}),
		});
	}

}

function isMethodLike(member: Node): boolean {
	const { type } = member as { type: string };

	return type === 'MethodDefinition' || type === 'TSAbstractMethodDefinition';
}

function isGetterSetterPair(previousMember: Node, currentMember: Node, sourceCode: SourceCode): boolean {
	const getter = previousMember as MethodLike;
	const setter = currentMember as MethodLike;

	return getter.kind === 'get'
		&& setter.kind === 'set'
		&& getter.static === setter.static
		&& getter.key != null
		&& setter.key != null
		&& sourceCode.getText(getter.key) === sourceCode.getText(setter.key);
}

function hasCommentsBetweenMembers(previousMember: Node, currentMember: Node, sourceCode: SourceCode): boolean {
	return hasCommentsInRange(previousMember.range![1], getMemberStartRange(currentMember, sourceCode), sourceCode);
}

function hasCommentsAfterMember(member: Node, classBody: ClassBody, sourceCode: SourceCode): boolean {
	return hasCommentsInRange(member.range![1], classBody.range![1] - 1, sourceCode);
}

function hasCommentsInRange(start: number, end: number, sourceCode: SourceCode): boolean {
	return sourceCode.getAllComments().some(comment =>
		comment.range![0] >= start
		&& comment.range![1] <= end);
}

function getBlankLineCount(previousMember: Node, currentMember: Node, sourceCode: SourceCode): number {
	const firstGapLine = previousMember.loc!.end.line;
	const lastGapLine  = getMemberStartLine(currentMember, sourceCode) - 2;

	return sourceCode.lines
		.slice(firstGapLine, lastGapLine + 1)
		.filter(line => line.trim() === '')
		.length;
}

function getBlankLineCountAfterMember(member: Node, classBody: ClassBody, sourceCode: SourceCode): number {
	return sourceCode.lines
		.slice(member.loc!.end.line, classBody.loc!.end.line - 1)
		.filter(line => line.trim() === '')
		.length;
}

function getRequiredGap(currentMember: Node, sourceCode: SourceCode): string {
	const lineEnding = sourceCode.text.includes('\r\n') ? '\r\n' : '\n';
	const indent     = sourceCode.lines[getMemberStartLine(currentMember, sourceCode) - 1]!.match(/^\s*/)?.[0] ?? '';

	return `${lineEnding}${lineEnding}${indent}`;
}

function getDirectGap(currentMember: Node, sourceCode: SourceCode): string {
	const lineEnding = sourceCode.text.includes('\r\n') ? '\r\n' : '\n';
	const indent     = sourceCode.lines[getMemberStartLine(currentMember, sourceCode) - 1]!.match(/^\s*/)?.[0] ?? '';

	return `${lineEnding}${indent}`;
}

function getRequiredGapBeforeClosingBrace(classBody: ClassBody, sourceCode: SourceCode): string {
	const lineEnding = sourceCode.text.includes('\r\n') ? '\r\n' : '\n';
	const indent     = sourceCode.lines[classBody.loc!.end.line - 1]!.match(/^\s*/)?.[0] ?? '';

	return `${lineEnding}${lineEnding}${indent}`;
}

function getMemberStartRange(member: Node, sourceCode: SourceCode): number {
	return getLeadingJsDocComment(member, sourceCode)?.range![0] ?? member.range![0];
}

function getMemberStartLine(member: Node, sourceCode: SourceCode): number {
	return getLeadingJsDocComment(member, sourceCode)?.loc?.start.line ?? member.loc!.start.line;
}

function getLeadingJsDocComment(member: Node, sourceCode: SourceCode) {
	return sourceCode.getAllComments().find(comment =>
		comment.type === 'Block'
		&& comment.value.startsWith('*')
		&& comment.range![1] <= member.range![0]
		&& sourceCode.text.slice(comment.range![1], member.range![0]).trim() === '');
}

function collapseExcessBlankLines(text: string): string {
	return text.replace(/(?:\r?\n[^\S\r\n]*){3,}/g, consecutiveLineBreaks => {
		const lineEnding = consecutiveLineBreaks.includes('\r\n') ? '\r\n' : '\n';
		const indent     = consecutiveLineBreaks.match(/[^\S\r\n]*$/)?.[0] ?? '';

		return `${lineEnding}${lineEnding}${indent}`;
	});
}
