import stylistic from '@stylistic/eslint-plugin';
import { BaseESLintRule } from "../BaseESLintRule.mjs";
import { getSourceCode } from "../utils.mjs";
import { isAlignedMember } from "./InterfaceLayout.mjs";
const baseRule = stylistic.rules['type-annotation-spacing'];
const ownedMessages = new Set(['unexpectedSpaceBefore', 'unexpectedSpaceBetween']);
// A fixer whose edits only mark the text each fix would replace, so a fix can be inspected before its report is passed on
const rangeFixer = {
    insertTextAfter: syntaxElement => ({ range: [syntaxElement.range[1], syntaxElement.range[1]], text: '' }),
    insertTextAfterRange: range => ({ range: [range[1], range[1]], text: '' }),
    insertTextBefore: syntaxElement => ({ range: [syntaxElement.range[0], syntaxElement.range[0]], text: '' }),
    insertTextBeforeRange: range => ({ range: [range[0], range[0]], text: '' }),
    remove: syntaxElement => ({ range: syntaxElement.range, text: '' }),
    removeRange: range => ({ range, text: '' }),
    replaceText: syntaxElement => ({ range: syntaxElement.range, text: '' }),
    replaceTextRange: range => ({ range, text: '' }),
};
/**
 * `@stylistic/type-annotation-spacing`, minus the space-before-colon checks on interface fields that
 * `local-rules/interface-layout` aligns. Those fields pad before their colon to line the types up, which the
 * stylistic rule would otherwise strip again. Every other type annotation is checked as before, except that a spot
 * whose fix would rewrite anything but spaces or tabs, such as a comment beside the colon or arrow, is left as written.
 */
export class TypeAnnotationSpacing extends BaseESLintRule {
    static meta = {
        ...baseRule.meta,
        docs: {
            description: 'Require consistent spacing around type annotations, except before colons aligned by interface-layout',
            category: 'Stylistic Issues',
            recommended: false,
        },
    };
    static create(context) {
        const sourceCode = getSourceCode(context);
        return baseRule.create(Object.create(context, {
            report: {
                value: (descriptor) => {
                    if (!isOwnedByInterfaceLayout(descriptor, sourceCode) && !rewritesMoreThanSpacing(descriptor, sourceCode)) {
                        context.report(descriptor);
                    }
                },
            },
        }));
    }
}
function isOwnedByInterfaceLayout(descriptor, sourceCode) {
    if (!descriptor.messageId || !ownedMessages.has(descriptor.messageId) || !descriptor.node) {
        return false;
    }
    // The reported token is the colon (inside the TSTypeAnnotation) or the `?` before it (directly in the member)
    let node = sourceCode.getNodeByRangeIndex(descriptor.node.range[0]);
    if (node?.type === 'TSTypeAnnotation') {
        node = node.parent;
    }
    return Boolean(node) && isAlignedMember(node, sourceCode);
}
/**
 * Whether the report's fix would rewrite anything but spaces or tabs. The stock fixes that remove a space remove the
 * whole gap beside the colon or arrow, so they would delete a comment there along with it.
 */
function rewritesMoreThanSpacing(descriptor, sourceCode) {
    const edits = descriptor.fix?.(rangeFixer);
    if (!edits) {
        return false;
    }
    return [...(Symbol.iterator in edits ? edits : [edits])].some(edit => !/^[ \t]*$/.test(sourceCode.text.slice(...edit.range)));
}
