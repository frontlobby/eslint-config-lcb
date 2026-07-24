import assert from 'node:assert/strict';

import type { Rule } from 'eslint';

import { BaseESLintRule } from '../../lib/BaseESLintRule.mts';

class StubRule extends BaseESLintRule {

	static meta = {
		type : 'suggestion' as const,
		docs : {
			description : 'Stub rule for testing',
		},
		schema : [],
	};

	static create(context: Rule.RuleContext) {
		return {
			Program() {
				context.report({ message : 'stub', loc : { line : 1, column : 0 } });
			},
		};
	}

}

assert.throws(() => BaseESLintRule.meta, /must implement static meta/);
assert.throws(() => BaseESLintRule.create({} as Rule.RuleContext), /must implement static create/);
assert.throws(() => BaseESLintRule.toEslintRule(), /cannot be exported directly/);

const eslintRule = StubRule.toEslintRule();

assert.equal(eslintRule.meta, StubRule.meta);
assert.equal(eslintRule.create, StubRule.create);
assert.equal(typeof eslintRule.create, 'function');
