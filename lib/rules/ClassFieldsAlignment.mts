import type { Rule } from 'eslint';
import _             from 'lodash';

import { type AlignedLine, findAlignedToken, reportMisalignedRun, splitIntoRuns } from '../alignment.mts';
import { BaseESLintRule } from '../BaseESLintRule.mts';
import { isSingleLine }   from '../utils.mts';

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

	options: ResolvedClassFieldsAlignmentOptions;

	constructor(context: Rule.RuleContext) {
		super(context);
		this.options = Object.assign({ maxSpaces : 25 }, context.options[0] as ClassFieldsAlignmentOptions | undefined);
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
			reportMisalignedRun(this.context, block, messageAlign);
		}
	}

	/**
	 * Fields on consecutive lines. Any other member ends a block, and so does a field whose padding before `=` would
	 * differ from the previous field's by more than `maxSpaces`.
	 */
	buildAlignmentBlocks(node: ClassBody): ClassFieldLine[][] {
		const fields = node.body.map(member => this.getClassFieldLine(member));

		return splitIntoRuns(fields, (previousField, field) => previousField !== null
			&& field !== null
			&& field.member.loc.start.line === previousField.member.loc.end.line + 1
			&& this.isWithinMaxSpacing(field, previousField))
			.map(block => _.compact(block));
	}

	isWithinMaxSpacing(field: ClassFieldLine, previousField: ClassFieldLine): boolean {
		const fieldColumn         = field.tokenBefore.loc.end.column;
		const previousFieldColumn = previousField.tokenBefore.loc.end.column;

		return Math.abs(fieldColumn - previousFieldColumn) <= this.options.maxSpaces;
	}

	getClassFieldLine(member: ClassMember): ClassFieldLine | null {
		if (member.type !== 'PropertyDefinition' || !member.key || !member.value || !isSingleLine(member)) {
			return null;
		}

		const alignedToken = findAlignedToken(this.sourceCode, member.key as unknown as Rule.Node, member.value.range[0]);

		return alignedToken ? { ...alignedToken, member } : null;
	}

}

interface ClassFieldsAlignmentOptions {
	maxSpaces? : number;
}

interface ResolvedClassFieldsAlignmentOptions {
	maxSpaces : number;
}

interface ClassBody {
	body : ClassMember[];
}

interface ClassMember {
	type   : string;
	key?   : ClassMemberNode;
	value? : ClassMemberNode | null;
	loc    : SourceLocation;
}

interface ClassMemberNode {
	range : [ number, number ];
}

interface SourceLocation {
	start : SourcePosition;
	end   : SourcePosition;
}

interface SourcePosition {
	line   : number;
	column : number;
}

type ClassFieldLine = AlignedLine<ClassMember>;
