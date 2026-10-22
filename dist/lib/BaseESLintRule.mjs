import { getSourceCode } from "./utils.mjs";
/**
 * Base class for all ESLint rules.
 */
export class BaseESLintRule {
    context;
    sourceCode;
    constructor(context) {
        this.context = context;
        this.sourceCode = getSourceCode(context);
    }
    static get meta() {
        throw new TypeError(`${this.name} must implement static meta`);
    }
    static create(_context) {
        throw new TypeError(`${this.name} must implement static create`);
    }
    static toEslintRule() {
        if (this === BaseESLintRule) {
            throw new TypeError('BaseESLintRule cannot be exported directly');
        }
        return { meta: this.meta, create: this.create };
    }
}
