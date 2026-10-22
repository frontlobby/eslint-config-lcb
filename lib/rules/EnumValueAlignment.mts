import type { Rule } from 'eslint';
import type { Expression, Identifier } from 'estree';
import _             from 'lodash';

import { type AlignedLine, findAlignedToken, reportMisalignedRun, splitIntoRuns } from '../alignment.mts';
import { BaseESLintRule } from '../BaseESLintRule.mts';
import { isSingleLine }   from '../utils.mts';

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

		// Consecutive members belong to the same block only when no source lines sit between them
		const blocks = splitIntoRuns(members, (prevMember, nextMember) => !hasInterveningLineBetweenMembers(prevMember, nextMember));

		for (const block of blocks) {
			reportMisalignedRun(this.context, _.compact(block.map(member => this.getLineInfo(member))), messageAlign);
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

		// An enum member's name is a single token, so the token before its `=` is the name itself
		const alignedToken = findAlignedToken(this.sourceCode, member.id, member.initializer.range![0]);

		return alignedToken ? { ...alignedToken, member } : null;
	}

}

interface TSEnumMember {
	type         : 'TSEnumMember';
	id           : Identifier;
	initializer? : Expression;
	loc          : NonNullable<Identifier['loc']>;
	range        : [number, number];
}

interface TSEnumDeclaration {
	type    : 'TSEnumDeclaration';
	members : TSEnumMember[];
	loc     : NonNullable<Identifier['loc']>;
}

type LineInfo = AlignedLine<TSEnumMember>;

/** Every enum member lies on a single source line, and all members share that line. */
function isMembersOnOneSourceLine(node: TSEnumDeclaration): boolean {
	const { members } = node;
	if (_.isEmpty(members)) {
		return false;
	}

	let line: number | null = null;

	for (const member of members) {
		if (!isSingleLine(member)) {
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

function hasInterveningLineBetweenMembers(prevMember: TSEnumMember, nextMember: TSEnumMember): boolean {
	return nextMember.loc.start.line > prevMember.loc.end.line + 1;
}
