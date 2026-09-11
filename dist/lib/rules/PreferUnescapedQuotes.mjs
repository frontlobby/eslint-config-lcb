import { BaseESLintRule } from "../BaseESLintRule.mjs";
import { getSourceCode } from "../utils.mjs";
const message = "Use double quotes so the contained single quote doesn't have to be escaped";
/**
 * Rewrite single-quoted strings that escape a single quote as double-quoted strings.
 *
 * The core `quotes` rule with `avoidEscape` permits both forms but never picks one, so
 * 'it\'s' and "it's" both pass. This settles it on the form without the escape.
 */
export class PreferUnescapedQuotes extends BaseESLintRule {
    static meta = {
        type: 'suggestion',
        docs: {
            description: 'Prefer double quotes for strings that would otherwise escape a single quote',
            category: 'Stylistic Issues',
            recommended: false,
        },
        fixable: 'code',
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
        const preferUnescapedQuotes = new PreferUnescapedQuotes(context);
        return {
            Literal(node) {
                preferUnescapedQuotes.checkLiteral(node);
            },
        };
    }
    checkLiteral(node) {
        if (typeof node.value !== 'string') {
            return;
        }
        const raw = this.sourceCode.getText(node);
        if (!raw.startsWith("'")) {
            return;
        }
        const converted = toDoubleQuoted(raw);
        if (!converted) {
            return;
        }
        this.context.report({ node, message, fix: fixer => fixer.replaceText(node, converted) });
    }
}
/**
 * @returns the double-quoted equivalent, or null when the swap would not remove an escape
 */
function toDoubleQuoted(raw) {
    const body = raw.slice(1, -1);
    let hasEscape = false;
    let converted = '';
    for (let index = 0; index < body.length; index++) {
        const character = body[index];
        if (character !== '\\') {
            // A double quote of its own would need escaping in the swapped form, so the swap gains nothing
            if (character === '"') {
                return null;
            }
            converted += character;
            continue;
        }
        const escaped = body[index + 1];
        index++;
        if (escaped === '"') {
            return null;
        }
        if (escaped === "'") {
            hasEscape = true;
            converted += escaped;
            continue;
        }
        converted += character + escaped;
    }
    return hasEscape ? `"${converted}"` : null;
}
