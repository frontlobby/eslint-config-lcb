import type { AST, Rule, SourceCode } from 'eslint';

import { BaseESLintRule } from '../BaseESLintRule.mts';
import { getSourceCode }  from '../utils.mts';

const messageAlign = 'Class field initializers should be aligned';

/**
 * Align initialized class fields on their equals signs.
 */
export class ClassFieldsAlignment extends BaseESLintRule {

	static meta = {
		type : 'layout',
		docs : {
			description : 'Align consecutive class field initializers on their equals signs',
			category    : 'Best Practices',
			recommended : false,
		},
		fixable : 'whitespace',
		schema  : [ {
			type       : 'object',
			properties : {
				maxSpaces : {
					type    : 'integer',
					minimum : 0,
				},
			},
			additionalProperties : false,
		} ],
	} as const;

	context: Rule.RuleContext;
	sourceCode: SourceCode;
	options: ResolvedClassFieldsAlignmentOptions;

	constructor(context: Rule.RuleContext) {
		super();
		this.context    = context;
		this.sourceCode = getSourceCode(context);
		this.options    = Object.assign({ maxSpaces : 25 }, context.options[0] as ClassFieldsAlignmentOptions | undefined);
	}

	static create(context: Rule.RuleContext): Rule.RuleListener {
		const classFieldsAlignment = new ClassFieldsAlignment(context);

		return {
			ClassBody(node) {
				classFieldsAlignment.checkClassBody(node as unknown as ClassBody);
			},
		};
	}

	checkClassBody(node: ClassBody): void {
		for (const block of this.buildAlignmentBlocks(node)) {
			if (block.length < 2) {
				continue;
			}

			const equalsColumn = Math.max(...block.map(field => field.tokenBeforeEquals.loc.end.column)) + 1;

			for (const field of block) {
				if (field.equalsToken.loc.start.column !== equalsColumn) {
					this.reportUnalignedField(field, equalsColumn);
				}
			}
		}
	}

	buildAlignmentBlocks(node: ClassBody): ClassFieldLine[][] {
		const blocks: ClassFieldLine[][]         = [];
		let currentBlock: ClassFieldLine[]       = [];
		let previousField: ClassFieldLine | null = null;

		for (const member of node.body) {
			const field = this.getClassFieldLine(member);

			if (!field || !previousField || field.member.loc!.start.line !== previousField.member.loc!.end.line + 1) {
				if (currentBlock.length > 0) {
					blocks.push(currentBlock);
				}
				currentBlock = field ? [ field ] : [];
			}
			else if (this.isWithinMaxSpacing(field, previousField)) {
				currentBlock.push(field);
			}
			else {
				blocks.push(currentBlock);
				currentBlock = [ field ];
			}

			previousField = field;
		}

		if (currentBlock.length > 0) {
			blocks.push(currentBlock);
		}

		return blocks;
	}

	isWithinMaxSpacing(field: ClassFieldLine, previousField: ClassFieldLine): boolean {
		const fieldColumn         = field.tokenBeforeEquals.loc.end.column;
		const previousFieldColumn = previousField.tokenBeforeEquals.loc.end.column;

		return Math.abs(fieldColumn - previousFieldColumn) <= this.options.maxSpaces;
	}

	getClassFieldLine(member: ClassMember): ClassFieldLine | null {
		if (member.type !== 'PropertyDefinition' || !member.key || !member.value || member.loc.start.line !== member.loc.end.line) {
			return null;
		}

		const equalsToken = this.getEqualsToken(member);
		if (!equalsToken) {
			return null;
		}

		const tokenBeforeEquals = this.sourceCode.getTokenBefore(equalsToken)!;
		const textBeforeEquals  = this.sourceCode.text.slice(tokenBeforeEquals.range[1], equalsToken.range[0]);

		return /^[ \t]*$/.test(textBeforeEquals) ? { equalsToken, member, tokenBeforeEquals } : null;
	}

	getEqualsToken(member: ClassMember): AST.Token | null {
		let token = this.sourceCode.getTokenAfter(member.key! as unknown as Rule.Node);

		while (token && token.range[0] < member.value!.range![0]) {
			if (token.value === '=') {
				return token;
			}
			token = this.sourceCode.getTokenAfter(token);
		}

		return null;
	}

	reportUnalignedField(field: ClassFieldLine, equalsColumn: number): void {
		this.context.report({
			node    : field.member as unknown as Rule.Node,
			loc     : field.equalsToken.loc.start,
			message : messageAlign,
			fix     : fixer => fixer.replaceTextRange(
				[ field.tokenBeforeEquals.range[1], field.equalsToken.range[0] ],
				' '.repeat(equalsColumn - field.tokenBeforeEquals.loc.end.column)
			),
		});
	}

}

interface ClassFieldsAlignmentOptions {
	maxSpaces?: number;
}

interface ResolvedClassFieldsAlignmentOptions {
	maxSpaces: number;
}

interface ClassBody {
	body: ClassMember[];
}

interface ClassMember {
	type: string;
	key?: ClassMemberNode;
	value?: ClassMemberNode | null;
	loc: SourceLocation;
}

interface ClassMemberNode {
	range: [ number, number ];
}

interface SourceLocation {
	start: SourcePosition;
	end: SourcePosition;
}

interface SourcePosition {
	line: number;
	column: number;
}

interface ClassFieldLine {
	equalsToken: AST.Token;
	member: ClassMember;
	tokenBeforeEquals: AST.Token;
}
