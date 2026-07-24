import type { AST, Rule, SourceCode } from 'eslint';
import type { Expression, Identifier } from 'estree';
import _                              from 'lodash';

import { BaseESLintRule }              from '../BaseESLintRule.mts';
import { getSourceCode, isSingleLine } from '../utils.mts';

const messageAlign   = 'Enum values should be aligned';
const messageSpacing = "Use a single space on each side of '=' in a single-line enum";

/**
 * Align TypeScript enum members on their equals signs.
 */
export class EnumValueAlignment extends BaseESLintRule {

	static meta = {
		type : 'layout',
		docs : {
			description : 'Align TypeScript enum members on their equals signs',
			category    : 'Best Practices',
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
		const enumValueAlignment = new EnumValueAlignment(context);

		return {
			TSEnumDeclaration(node: Rule.Node) {
				enumValueAlignment.checkEnum(node as unknown as TSEnumDeclaration);
			},
		};
	}

	checkEnum(node: TSEnumDeclaration): void {
		const { members } = node;
		const lines       = members.map(member => this.getLineInfo(member)).filter((line): line is LineInfo => Boolean(line));

		if (_.isEmpty(lines)) {
			return;
		}

		if (isMembersOnOneSourceLine(node)) {
			for (const line of lines) {
				this.checkSingleLineMemberSpacing(line);
			}
			return;
		}

		const blocks = splitMembersIntoBlocksByLineGaps(members);

		for (const block of blocks) {
			const blockLines = block.map(member => this.getLineInfo(member)).filter((line): line is LineInfo => Boolean(line));

			if (blockLines.length < 2) {
				continue;
			}

			const equalsColumn = Math.max(...blockLines.map(line => line.keyEndColumn)) + 1;

			blockLines
				.filter(line => line.equalsToken.loc.start.column !== equalsColumn)
				.forEach(line => this.reportUnalignedMember(line, equalsColumn));
		}
	}

	checkSingleLineMemberSpacing(line: LineInfo): void {
		const { member, equalsToken } = line;
		const init                    = member.initializer!;

		const textBeforeEquals = this.sourceCode.text.slice(member.id.range![1], equalsToken.range[0]);
		const textAfterEquals  = this.sourceCode.text.slice(equalsToken.range[1], init.range![0]);

		if (textBeforeEquals === ' ' && textAfterEquals === ' ') {
			return;
		}

		this.context.report({
			node    : line.member,
			loc     : equalsToken.loc.start,
			message : messageSpacing,
			fix     : fixer => {
				const fixes: Rule.Fix[] = [];

				if (textBeforeEquals !== ' ') {
					fixes.push(fixer.replaceTextRange([ member.id.range![1], equalsToken.range[0] ], ' '));
				}

				if (textAfterEquals !== ' ') {
					fixes.push(fixer.replaceTextRange([ equalsToken.range[1], init.range![0] ], ' '));
				}

				return fixes.length === 1 ? fixes[0]! : fixes;
			},
		});
	}

	getLineInfo(member: TSEnumMember): LineInfo | null {
		if (!member.initializer || !isSingleLine(member.id) || !isSingleLine(member.initializer)) {
			return null;
		}

		const equalsToken = this.getEqualsToken(member);
		if (!equalsToken) {
			return null;
		}

		const textBetweenKeyAndEquals = this.sourceCode.text.slice(member.id.range![1], equalsToken.range[0]);
		return !/^[ \t]*$/.test(textBetweenKeyAndEquals) ? null : { equalsToken, keyEndColumn : member.id.loc!.end.column, member };
	}

	getEqualsToken(member: TSEnumMember): EqualsToken | null {
		let token = this.sourceCode.getTokenAfter(member.id);

		while (token && token.range[0] < member.initializer!.range![0]) {
			if (token.value === '=') {
				return token as EqualsToken;
			}
			token = this.sourceCode.getTokenAfter(token);
		}

		return null;
	}

	reportUnalignedMember(line: LineInfo, equalsColumn: number): void {
		this.context.report({
			node    : line.member,
			loc     : line.equalsToken.loc.start,
			message : messageAlign,
			fix     : fixer => this.getSpacingFix(line, equalsColumn, fixer),
		});
	}

	getSpacingFix(line: LineInfo, equalsColumn: number, fixer: Rule.RuleFixer): Rule.Fix {
		const spacing = ' '.repeat(equalsColumn - line.keyEndColumn);
		return fixer.replaceTextRange([ line.member.id.range![1], line.equalsToken.range[0] ], spacing);
	}

}

interface TSEnumMember {
	type: 'TSEnumMember';
	id: Identifier;
	initializer?: Expression;
	loc: NonNullable<Identifier['loc']>;
	range: [number, number];
}

interface TSEnumDeclaration {
	type: 'TSEnumDeclaration';
	members: TSEnumMember[];
	loc: NonNullable<Identifier['loc']>;
}

interface EqualsToken {
	type: AST.Token['type'];
	value: string;
	range: [number, number];
	loc: {
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
}

interface LineInfo {
	equalsToken: EqualsToken;
	keyEndColumn: number;
	member: TSEnumMember;
}

/** Every enum member lies on a single source line, and all members share that line. */
function isMembersOnOneSourceLine(node: TSEnumDeclaration): boolean {
	const { members } = node;

	if (_.isEmpty(members)) {
		return false;
	}

	let line: number | null = null;

	for (const member of members) {
		if (member.loc.start.line !== member.loc.end.line) {
			return false;
		}

		if (line === null) {
			line = member.loc.start.line;
		}
		else if (member.loc.start.line !== line) {
			return false;
		}
	}

	return true;
}

/** Consecutive members belong to the same block only when no source lines sit between them. */
function splitMembersIntoBlocksByLineGaps(members: TSEnumMember[]): TSEnumMember[][] {
	if (_.isEmpty(members)) {
		return [];
	}

	const blocks: TSEnumMember[][] = [ [ members[0]! ] ];

	for (let i = 1; i < members.length; i++) {
		const prev = members[i - 1]!;
		const curr = members[i]!;

		if (hasInterveningLineBetweenMembers(prev, curr)) {
			blocks.push([]);
		}

		blocks[blocks.length - 1]!.push(curr);
	}

	return blocks;
}

function hasInterveningLineBetweenMembers(prevMember: TSEnumMember, nextMember: TSEnumMember): boolean {
	return nextMember.loc.start.line > prevMember.loc.end.line + 1;
}
