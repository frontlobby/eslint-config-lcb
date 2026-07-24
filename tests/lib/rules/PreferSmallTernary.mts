/**
 * @fileoverview Prefer ternary expressions for small if/else patterns
 */
import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import { PreferSmallTernary } from '../../../lib/rules/PreferSmallTernary.mts';
import { namedCase } from '../../../lib/utils.mts';

const ruleTester = new RuleTester({
	languageOptions : {
		ecmaVersion : 2022,
		parser,
		sourceType  : 'module',
	},
});

const defaultOptions = { options : [ { maxLen : 150 } ] };
const message        = 'Prefer a ternary expression when the if/else fits within maxLen';

ruleTester.run('prefer-small-ternary', PreferSmallTernary.toEslintRule(), {
	valid : [
		namedCase('ignores if/else return when ternary exceeds maxLen', {
			...defaultOptions,
			code : `
				function getValue(condition) {
					if (condition) {
						return 'this branch is intentionally long enough to exceed the configured maxLen limit';
					}
					else {
						return 'this branch is also intentionally long enough to exceed the configured maxLen limit';
					}
				}
			`,
		}),

		namedCase('ignores multiline condition', {
			...defaultOptions,
			code : `
				function getValue(a, b) {
					if (a
						&& b) {
						return 1;
					}
					else {
						return 2;
					}
				}
			`,
		}),

		namedCase('ignores multiline branch values', {
			...defaultOptions,
			code : `
				function getValue(condition) {
					if (condition) {
						return foo(
							1
						);
					}
					else {
						return 2;
					}
				}
			`,
		}),

		namedCase('ignores mismatched assignment targets', {
			...defaultOptions,
			code : `
				function setValues(condition) {
					if (condition) {
						foo = 1;
					}
					else {
						bar = 2;
					}
				}
			`,
		}),

		namedCase('ignores else-if chains', {
			...defaultOptions,
			code : `
				function getValue(condition, other) {
					if (condition) {
						return 1;
					}
					else if (other) {
						return 2;
					}
					else {
						return 3;
					}
				}
			`,
		}),

		namedCase('ignores blocks with extra statements', {
			...defaultOptions,
			code : `
				function getValue(condition) {
					if (condition) {
						log('yes');
						return 1;
					}
					else {
						return 2;
					}
				}
			`,
		}),

		namedCase('ignores comments inside if body', {
			...defaultOptions,
			code : `
				function getValue(condition) {
					if (condition) {
						// pick one
						return 1;
					}
					else {
						return 2;
					}
				}
			`,
		}),

		namedCase('ignores nested ternary branch values', {
			...defaultOptions,
			code : `
				function getValue(condition, other) {
					if (condition) {
						return other ? 1 : 2;
					}
					else {
						return 3;
					}
				}
			`,
		}),

		namedCase('ignores if not directly in block statement', {
			...defaultOptions,
			code : `
				function getValue(condition) {
					if (condition) return 1;
					return 2;
				}
			`,
		}),

		namedCase('does not report when replacement length equals maxLen', {
			options : [ { maxLen : 22 } ],
			code    : `
				function f(c) {
					if (c) { return 1; } else { return 2; }
				}
			`,
		}),
	],

	invalid : [
		namedCase('converts if/else return to ternary', {
			...defaultOptions,
			code : `
				function getValue(condition) {
					if (condition) {
						return 'yes';
					}
					else {
						return 'no';
					}
				}
			`,
			output : `
				function getValue(condition) {
					return condition ? 'yes' : 'no';
				}
			`,
			errors : [ { message } ],
		}),

		namedCase('converts if followed by return to ternary', {
			...defaultOptions,
			code : `
				function getValue(condition) {
					if (condition) {
						return 'yes';
					}
					return 'no';
				}
			`,
			output : `
				function getValue(condition) {
					return condition ? 'yes' : 'no';
				}
			`,
			errors : [ { message } ],
		}),

		namedCase('converts if/else assignment to ternary', {
			...defaultOptions,
			code : `
				function setValue(condition) {
					if (condition) {
						result = 'yes';
					}
					else {
						result = 'no';
					}
				}
			`,
			output : `
				function setValue(condition) {
					result = condition ? 'yes' : 'no';
				}
			`,
			errors : [ { message } ],
		}),

		namedCase('converts if followed by assignment to ternary', {
			...defaultOptions,
			code : `
				function setValue(condition) {
					if (condition) {
						result = 'yes';
					}
					result = 'no';
				}
			`,
			output : `
				function setValue(condition) {
					result = condition ? 'yes' : 'no';
				}
			`,
			errors : [ { message } ],
		}),
	],
});
