import stylistic from '@stylistic/eslint-plugin';
import { BaseESLintRule } from "../BaseESLintRule.mjs";
import { getSourceCode } from "../utils.mjs";
import { isAlignedMember } from "./InterfaceLayout.mjs";
const baseRule = stylistic.rules['type-annotation-spacing'];
const ownedMessages = new Set(['unexpectedSpaceBefore', 'unexpectedSpaceBetween']);
/**
 * `@stylistic/type-annotation-spacing`, minus the space-before-colon checks on interface fields that
 * `local-rules/interface-layout` aligns. Those fields pad before their colon to line the types up, which the
 * stylistic rule would otherwise strip again. Every other type annotation is checked as before.
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
                    if (!isOwnedByInterfaceLayout(descriptor, sourceCode)) {
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
