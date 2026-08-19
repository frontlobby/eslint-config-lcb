import { BaseESLintRule } from "../BaseESLintRule.mjs";
import { getSourceCode } from "../utils.mjs";
const memberMessage = 'Class methods should be separated by exactly one blank line';
const closingBraceMessage = 'The final class method should be followed by exactly one blank line';
const getterSetterMessage = 'A getter and its setter should not be separated by a blank line';
/**
 * Require exactly one blank line between consecutive class methods and after
 * a class's final method.
 *
 * Getters, setters, constructors, and static methods are all represented by
 * `MethodDefinition` nodes, so they follow the same spacing requirement.
 */
export class ClassMethodsNewline extends BaseESLintRule {
    static meta = {
        type: 'layout',
        docs: {
            description: 'Require exactly one blank line between consecutive class methods',
            category: 'Stylistic Issues',
            recommended: false,
        },
        fixable: 'whitespace',
        schema: [],
    };
    context;
    sourceCode;
    constructor(context) {
        super();
        this.context = context;
        this.sourceCode = getSourceCode(context);
    }
    static create(context) {
        const rule = new ClassMethodsNewline(context);
        return {
            ClassBody(node) {
                rule.checkClassBody(node);
            },
        };
    }
    checkClassBody(classBody) {
        for (let index = 1; index < classBody.body.length; index++) {
            const previousMember = classBody.body[index - 1];
            const currentMember = classBody.body[index];
            if (!isMethodLike(previousMember) || !isMethodLike(currentMember)) {
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
            this.checkFinalMemberGap(finalMember, classBody);
        }
    }
    checkMemberGap(previousMember, currentMember) {
        const blankLineCount = getBlankLineCount(previousMember, currentMember, this.sourceCode);
        if (blankLineCount === 1) {
            return;
        }
        const gapRange = [previousMember.range[1], currentMember.range[0]];
        const hasComments = this.sourceCode.getAllComments().some(comment => comment.range[0] >= gapRange[0] && comment.range[1] <= gapRange[1]);
        this.context.report({
            node: currentMember,
            message: memberMessage,
            ...(hasComments ? {} : {
                fix: fixer => fixer.replaceTextRange(gapRange, getRequiredGap(currentMember, this.sourceCode)),
            }),
        });
    }
    checkGetterSetterGap(getter, setter) {
        const blankLineCount = getBlankLineCount(getter, setter, this.sourceCode);
        if (blankLineCount === 0) {
            return;
        }
        const gapRange = [getter.range[1], setter.range[0]];
        const hasComments = this.sourceCode.getAllComments().some(comment => comment.range[0] >= gapRange[0] && comment.range[1] <= gapRange[1]);
        this.context.report({
            node: setter,
            message: getterSetterMessage,
            ...(hasComments ? {} : { fix: fixer => fixer.replaceTextRange(gapRange, getDirectGap(setter, this.sourceCode)) }),
        });
    }
    checkFinalMemberGap(finalMember, classBody) {
        const blankLineCount = getBlankLineCountAfterMember(finalMember, classBody, this.sourceCode);
        if (blankLineCount === 1) {
            return;
        }
        const gapRange = [finalMember.range[1], classBody.range[1] - 1];
        const hasComments = this.sourceCode.getAllComments().some(comment => comment.range[0] >= gapRange[0] && comment.range[1] <= gapRange[1]);
        this.context.report({
            node: finalMember,
            message: closingBraceMessage,
            ...(hasComments ? {} : {
                fix: fixer => fixer.replaceTextRange(gapRange, getRequiredGapBeforeClosingBrace(classBody, this.sourceCode)),
            }),
        });
    }
}
function isMethodLike(member) {
    const { type } = member;
    return type === 'MethodDefinition' || type === 'TSAbstractMethodDefinition';
}
function isGetterSetterPair(previousMember, currentMember, sourceCode) {
    const getter = previousMember;
    const setter = currentMember;
    return getter.kind === 'get'
        && setter.kind === 'set'
        && getter.static === setter.static
        && getter.key != null
        && setter.key != null
        && sourceCode.getText(getter.key) === sourceCode.getText(setter.key);
}
function getBlankLineCount(previousMember, currentMember, sourceCode) {
    const firstGapLine = previousMember.loc.end.line;
    const lastGapLine = currentMember.loc.start.line - 2;
    return sourceCode.lines
        .slice(firstGapLine, lastGapLine + 1)
        .filter(line => line.trim() === '')
        .length;
}
function getBlankLineCountAfterMember(member, classBody, sourceCode) {
    return sourceCode.lines
        .slice(member.loc.end.line, classBody.loc.end.line - 1)
        .filter(line => line.trim() === '')
        .length;
}
function getRequiredGap(currentMember, sourceCode) {
    const lineEnding = sourceCode.text.includes('\r\n') ? '\r\n' : '\n';
    const indent = sourceCode.lines[currentMember.loc.start.line - 1].match(/^\s*/)?.[0] ?? '';
    return `${lineEnding}${lineEnding}${indent}`;
}
function getDirectGap(currentMember, sourceCode) {
    const lineEnding = sourceCode.text.includes('\r\n') ? '\r\n' : '\n';
    const indent = sourceCode.lines[currentMember.loc.start.line - 1].match(/^\s*/)?.[0] ?? '';
    return `${lineEnding}${indent}`;
}
function getRequiredGapBeforeClosingBrace(classBody, sourceCode) {
    const lineEnding = sourceCode.text.includes('\r\n') ? '\r\n' : '\n';
    const indent = sourceCode.lines[classBody.loc.end.line - 1].match(/^\s*/)?.[0] ?? '';
    return `${lineEnding}${lineEnding}${indent}`;
}
