import { BaseESLintRule } from "../BaseESLintRule.mjs";
import { getSourceCode } from "../utils.mjs";
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
    context;
    sourceCode;
    options;
    constructor(context) {
        super();
        this.context = context;
        this.sourceCode = getSourceCode(context);
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
    buildAlignmentBlocks(node) {
        const blocks = [];
        let currentBlock = [];
        let previousField = null;
        for (const member of node.body) {
            const field = this.getClassFieldLine(member);
            if (!field || !previousField || field.member.loc.start.line !== previousField.member.loc.end.line + 1) {
                if (currentBlock.length > 0) {
                    blocks.push(currentBlock);
                }
                currentBlock = field ? [field] : [];
            }
            else if (this.isWithinMaxSpacing(field, previousField)) {
                currentBlock.push(field);
            }
            else {
                blocks.push(currentBlock);
                currentBlock = [field];
            }
            previousField = field;
        }
        if (currentBlock.length > 0) {
            blocks.push(currentBlock);
        }
        return blocks;
    }
    isWithinMaxSpacing(field, previousField) {
        const fieldColumn = field.tokenBeforeEquals.loc.end.column;
        const previousFieldColumn = previousField.tokenBeforeEquals.loc.end.column;
        return Math.abs(fieldColumn - previousFieldColumn) <= this.options.maxSpaces;
    }
    getClassFieldLine(member) {
        if (member.type !== 'PropertyDefinition' || !member.key || !member.value || member.loc.start.line !== member.loc.end.line) {
            return null;
        }
        const equalsToken = this.getEqualsToken(member);
        if (!equalsToken) {
            return null;
        }
        const tokenBeforeEquals = this.sourceCode.getTokenBefore(equalsToken);
        const textBeforeEquals = this.sourceCode.text.slice(tokenBeforeEquals.range[1], equalsToken.range[0]);
        return /^[ \t]*$/.test(textBeforeEquals) ? { equalsToken, member, tokenBeforeEquals } : null;
    }
    getEqualsToken(member) {
        let token = this.sourceCode.getTokenAfter(member.key);
        while (token && token.range[0] < member.value.range[0]) {
            if (token.value === '=') {
                return token;
            }
            token = this.sourceCode.getTokenAfter(token);
        }
        return null;
    }
    reportUnalignedField(field, equalsColumn) {
        this.context.report({
            node: field.member,
            loc: field.equalsToken.loc.start,
            message: messageAlign,
            fix: fixer => fixer.replaceTextRange([field.tokenBeforeEquals.range[1], field.equalsToken.range[0]], ' '.repeat(equalsColumn - field.tokenBeforeEquals.loc.end.column)),
        });
    }
}
