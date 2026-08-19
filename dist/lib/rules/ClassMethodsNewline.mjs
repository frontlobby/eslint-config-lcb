import { BaseESLintRule } from "../BaseESLintRule.mjs";
import { getSourceCode } from "../utils.mjs";
const memberMessage = 'Class methods should be separated by exactly one blank line';
const closingBraceMessage = 'The final class method should be followed by exactly one blank line';
const getterSetterMessage = 'A getter and its setter should not be separated by a blank line';
const overloadMessage = 'TypeScript overload signatures should not be separated by a blank line';
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
            if (hasCommentsBetweenMembers(previousMember, currentMember, this.sourceCode)) {
                this.checkCommentMemberGap(previousMember, currentMember);
                continue;
            }
            if (isGetterSetterPair(previousMember, currentMember, this.sourceCode)) {
                this.checkGetterSetterGap(previousMember, currentMember);
                continue;
            }
            if (isTypeScriptOverloadPair(previousMember, currentMember, this.sourceCode)) {
                this.checkOverloadGap(previousMember, currentMember);
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
    checkMemberGap(previousMember, currentMember) {
        const blankLineCount = getBlankLineCount(previousMember, currentMember, this.sourceCode);
        if (blankLineCount === 1) {
            return;
        }
        const gapRange = [previousMember.range[1], getMemberStartRange(currentMember, this.sourceCode)];
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
        const gapRange = [getter.range[1], getMemberStartRange(setter, this.sourceCode)];
        const hasComments = this.sourceCode.getAllComments().some(comment => comment.range[0] >= gapRange[0] && comment.range[1] <= gapRange[1]);
        this.context.report({
            node: setter,
            message: getterSetterMessage,
            ...(hasComments ? {} : { fix: fixer => fixer.replaceTextRange(gapRange, getDirectGap(setter, this.sourceCode)) }),
        });
    }
    checkOverloadGap(previousMember, currentMember) {
        const blankLineCount = getBlankLineCount(previousMember, currentMember, this.sourceCode);
        if (blankLineCount === 0) {
            return;
        }
        const gapRange = [previousMember.range[1], getMemberStartRange(currentMember, this.sourceCode)];
        const hasComments = this.sourceCode.getAllComments().some(comment => comment.range[0] >= gapRange[0] && comment.range[1] <= gapRange[1]);
        this.context.report({
            node: currentMember,
            message: overloadMessage,
            ...(hasComments ? {} : { fix: fixer => fixer.replaceTextRange(gapRange, getDirectGap(currentMember, this.sourceCode)) }),
        });
    }
    checkCommentMemberGap(previousMember, currentMember) {
        const gapRange = [previousMember.range[1], getMemberStartRange(currentMember, this.sourceCode)];
        this.reportExcessCommentBlankLines(currentMember, gapRange, memberMessage);
    }
    checkCommentFinalGap(finalMember, classBody) {
        const gapRange = [finalMember.range[1], classBody.range[1] - 1];
        this.reportExcessCommentBlankLines(finalMember, gapRange, closingBraceMessage);
    }
    reportExcessCommentBlankLines(node, gapRange, message) {
        const gap = this.sourceCode.text.slice(...gapRange);
        const collapsedGap = collapseExcessBlankLines(gap);
        if (gap === collapsedGap) {
            return;
        }
        this.context.report({
            node,
            message,
            fix: fixer => fixer.replaceTextRange(gapRange, collapsedGap),
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
function isTypeScriptOverloadPair(previousMember, currentMember, sourceCode) {
    const previous = previousMember;
    const current = currentMember;
    return (previous.kind === 'method' || previous.kind === 'constructor')
        && previous.kind === current.kind
        && previous.static === current.static
        && previous.key != null
        && current.key != null
        && sourceCode.getText(previous.key) === sourceCode.getText(current.key)
        && previous.value?.type === 'TSEmptyBodyFunctionExpression';
}
function hasCommentsBetweenMembers(previousMember, currentMember, sourceCode) {
    return hasCommentsInRange(previousMember.range[1], getMemberStartRange(currentMember, sourceCode), sourceCode);
}
function hasCommentsAfterMember(member, classBody, sourceCode) {
    return hasCommentsInRange(member.range[1], classBody.range[1] - 1, sourceCode);
}
function hasCommentsInRange(start, end, sourceCode) {
    return sourceCode.getAllComments().some(comment => comment.range[0] >= start
        && comment.range[1] <= end);
}
function getBlankLineCount(previousMember, currentMember, sourceCode) {
    const firstGapLine = previousMember.loc.end.line;
    const lastGapLine = getMemberStartLine(currentMember, sourceCode) - 2;
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
    const indent = sourceCode.lines[getMemberStartLine(currentMember, sourceCode) - 1].match(/^\s*/)?.[0] ?? '';
    return `${lineEnding}${lineEnding}${indent}`;
}
function getDirectGap(currentMember, sourceCode) {
    const lineEnding = sourceCode.text.includes('\r\n') ? '\r\n' : '\n';
    const indent = sourceCode.lines[getMemberStartLine(currentMember, sourceCode) - 1].match(/^\s*/)?.[0] ?? '';
    return `${lineEnding}${indent}`;
}
function getRequiredGapBeforeClosingBrace(classBody, sourceCode) {
    const lineEnding = sourceCode.text.includes('\r\n') ? '\r\n' : '\n';
    const indent = sourceCode.lines[classBody.loc.end.line - 1].match(/^\s*/)?.[0] ?? '';
    return `${lineEnding}${lineEnding}${indent}`;
}
function getMemberStartRange(member, sourceCode) {
    return getLeadingJsDocComment(member, sourceCode)?.range[0] ?? member.range[0];
}
function getMemberStartLine(member, sourceCode) {
    return getLeadingJsDocComment(member, sourceCode)?.loc?.start.line ?? member.loc.start.line;
}
function getLeadingJsDocComment(member, sourceCode) {
    return sourceCode.getAllComments().find(comment => comment.type === 'Block'
        && comment.value.startsWith('*')
        && comment.range[1] <= member.range[0]
        && sourceCode.text.slice(comment.range[1], member.range[0]).trim() === '');
}
function collapseExcessBlankLines(text) {
    return text.replace(/(?:\r?\n[^\S\r\n]*){3,}/g, consecutiveLineBreaks => {
        const lineEnding = consecutiveLineBreaks.includes('\r\n') ? '\r\n' : '\n';
        const indent = consecutiveLineBreaks.match(/[^\S\r\n]*$/)?.[0] ?? '';
        return `${lineEnding}${lineEnding}${indent}`;
    });
}
