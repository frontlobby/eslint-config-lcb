import type { Rule, SourceCode } from 'eslint';

import { getSourceCode } from './utils.mts';

/**
 * Base class for all ESLint rules.
 */
export class BaseESLintRule {

	readonly context: Rule.RuleContext;
	readonly sourceCode: SourceCode;

	constructor(context: Rule.RuleContext) {
		this.context    = context;
		this.sourceCode = getSourceCode(context);
	}

	static get meta(): Rule.RuleModule['meta'] {
		throw new TypeError(`${this.name} must implement static meta`);
	}

	static create(_context: Rule.RuleContext): Rule.RuleListener {
		throw new TypeError(`${this.name} must implement static create`);
	}

	static toEslintRule(this: ESLintRuleClass): Rule.RuleModule {
		if (this === BaseESLintRule) {
			throw new TypeError('BaseESLintRule cannot be exported directly');
		}
		return { meta : this.meta, create : this.create };
	}

}

type ESLintRuleClass = Pick<Rule.RuleModule, 'meta' | 'create'> & {
	readonly name: string;
};
