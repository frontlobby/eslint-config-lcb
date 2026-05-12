/**
 * Align TypeScript enum members on their equals signs.
 */
import { getSourceCode } from '../utils.mjs';

const MESSAGE_ALIGN   = 'Enum values should be aligned';
const MESSAGE_SPACING = 'Use a single space on each side of \'=\' in a single-line enum';

class EnumValueAlignment {

	constructor(context) {
		this.context    = context;
		this.sourceCode = getSourceCode(context);
	}

	static create(context) {
		const enumValueAlignment = new EnumValueAlignment(context);

		return {
			TSEnumDeclaration(node) {
				enumValueAlignment.checkEnum(node);
			},
		};
	}

	checkEnum(node) {
		const lines = node.members.map(member => this.getLineInfo(member)).filter(Boolean);
		if (lines.length === 0) {
			return;
		}

		if (isMembersOnOneSourceLine(node)) {
			for (const line of lines) {
				this.checkSingleLineMemberSpacing(line);
			}
			return;
		}

		if (lines.length < 2) {
			return;
		}

		const equalsColumn = Math.max(...lines.map(line => line.keyEndColumn)) + 1;

		lines
			.filter(line => line.equalsToken.loc.start.column !== equalsColumn)
			.forEach(line => this.reportUnalignedMember(line, equalsColumn));
	}

	checkSingleLineMemberSpacing(line) {
		const { member, equalsToken } = line;
		const init = member.initializer;

		const textBeforeEquals = this.sourceCode.text.slice(member.id.range[1], equalsToken.range[0]);
		const textAfterEquals  = this.sourceCode.text.slice(equalsToken.range[1], init.range[0]);

		if (textBeforeEquals === ' ' && textAfterEquals === ' ') {
			return;
		}

		this.context.report({
			node    : line.member,
			loc     : equalsToken.loc.start,
			message : MESSAGE_SPACING,
			fix     : fixer => {
				const fixes = [];

				if (textBeforeEquals !== ' ') {
					fixes.push(fixer.replaceTextRange([ member.id.range[1], equalsToken.range[0] ], ' '));
				}

				if (textAfterEquals !== ' ') {
					fixes.push(fixer.replaceTextRange([ equalsToken.range[1], init.range[0] ], ' '));
				}

				return fixes.length === 1 ? fixes[0] : fixes;
			},
		});
	}

	getLineInfo(member) {
		if (!member.initializer || !isSingleLine(member.id) || !isSingleLine(member.initializer)) {
			return null;
		}

		const equalsToken = this.getEqualsToken(member);
		if (!equalsToken) {
			return null;
		}

		const textBetweenKeyAndEquals = this.sourceCode.text.slice(member.id.range[1], equalsToken.range[0]);
		if (!/^[ \t]*$/.test(textBetweenKeyAndEquals)) {
			return null;
		}

		return { equalsToken, keyEndColumn : member.id.loc.end.column, member, };

		function isSingleLine(node) {
			return node.loc.start.line === node.loc.end.line;
		}
	}

	getEqualsToken(member) {
		let token = this.sourceCode.getTokenAfter(member.id);

		while (token && token.range[0] < member.initializer.range[0]) {
			if (token.value === '=') {
				return token;
			}
			token = this.sourceCode.getTokenAfter(token);
		}

		return null;
	}

	reportUnalignedMember(line, equalsColumn) {
		this.context.report({
			node    : line.member,
			loc     : line.equalsToken.loc.start,
			message : MESSAGE_ALIGN,
			fix     : fixer => this.getSpacingFix(line, equalsColumn, fixer),
		});
	}

	getSpacingFix(line, equalsColumn, fixer) {
		const spacing = ' '.repeat(equalsColumn - line.keyEndColumn);
		return fixer.replaceTextRange([ line.member.id.range[1], line.equalsToken.range[0] ], spacing);
	}
}

export default {
	meta : {
		type : 'layout',
		docs : {
			description : 'Align TypeScript enum members on their equals signs',
			category    : 'Best Practices',
			recommended : false,
		},
		fixable : 'whitespace',
		schema  : [],
	},

	create : EnumValueAlignment.create,
};

/** Every enum member lies on a single source line, and all members share that line. */
function isMembersOnOneSourceLine(node) {
	const { members } = node;

	if (members.length === 0) {
		return false;
	}

	let line = null;

	for (const member of members) {
		if (member.loc.start.line !== member.loc.end.line) {
			return false;
		}

		if (line === null) {
			line = member.loc.start.line;
		} else if (member.loc.start.line !== line) {
			return false;
		}
	}

	return true;
}

