import _ from 'lodash';
import { findAlignedToken, reportMisalignedRun, splitIntoRuns } from '../alignment.mjs';
import { BaseESLintRule } from '../BaseESLintRule.mjs';
import { isSingleLine } from '../utils.mjs';
const messageAlign = 'Class field initializers should be aligned';
/**
 * Align initialized class fields on their equals signs.
 */
export class ClassFieldsAlignment extends BaseESLintRule {
    static meta = {
        type: 'layout',
        docs: {
            description: 'Align consecutive class field initializers on their equals signs',
            category: 'Best Practices',
            recommended: false,
        },
        fixable: 'whitespace',
        schema: [{
                type: 'object',
                properties: {
                    maxSpaces: {
                        type: 'integer',
                        minimum: 0,
                    },
                },
                additionalProperties: false,
            }],
    };
    options;
    constructor(context) {
        super(context);
        this.options = Object.assign({ maxSpaces: 25 }, context.options[0]);
    }
    static create(context) {
        const classFieldsAlignment = new ClassFieldsAlignment(context);
        return {
            ClassBody(node) {
                classFieldsAlignment.checkClassBody(node);
            },
        };
    }
    checkClassBody(node) {
        for (const block of this.buildAlignmentBlocks(node)) {
            reportMisalignedRun(this.context, block, messageAlign);
        }
    }
    /**
     * Fields on consecutive lines. Any other member ends a block, and so does a field whose padding before `=` would
     * differ from the previous field's by more than `maxSpaces`.
     */
    buildAlignmentBlocks(node) {
        const fields = node.body.map(member => this.getClassFieldLine(member));
        return splitIntoRuns(fields, (previousField, field) => previousField !== null
            && field !== null
            && field.member.loc.start.line === previousField.member.loc.end.line + 1
            && this.isWithinMaxSpacing(field, previousField))
            .map(block => _.compact(block));
    }
    isWithinMaxSpacing(field, previousField) {
        const fieldColumn = field.tokenBefore.loc.end.column;
        const previousFieldColumn = previousField.tokenBefore.loc.end.column;
        return Math.abs(fieldColumn - previousFieldColumn) <= this.options.maxSpaces;
    }
    getClassFieldLine(member) {
        if (member.type !== 'PropertyDefinition' || !member.key || !member.value || !isSingleLine(member)) {
            return null;
        }
        const alignedToken = findAlignedToken(this.sourceCode, member.key, member.value.range[0]);
        return alignedToken ? { ...alignedToken, member } : null;
    }
}
