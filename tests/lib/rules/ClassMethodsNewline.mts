import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import { ClassMethodsNewline } from '../../../lib/rules/ClassMethodsNewline.mts';
import { namedCase }           from '../../../lib/utils.mts';

const ruleTester = new RuleTester({
	languageOptions : {
		ecmaVersion : 2022,
		parser,
		sourceType  : 'module',
	},
});

const memberMessage = 'Class methods should be separated by exactly one blank line';
const closingBraceMessage = 'The final class method should be followed by exactly one blank line';
const getterSetterMessage = 'A getter and its setter should not be separated by a blank line';

ruleTester.run('class-methods-newline', ClassMethodsNewline.toEslintRule(), {
	valid : [
		namedCase('accepts a single method followed by one blank line', `
			class Example {
				method() {}

			}
		`),

		namedCase('accepts methods, accessors, and static methods separated by one blank line', `
			class Example {
				constructor() {}

				get value() { return 1; }
				set value(value) {}

				static create() { return new Example(); }

				method() {}

			}
		`),

		namedCase('leaves non-method class members untouched', `
			class Example {
				field = 1;
				method() {}
				otherField = 2;
			}
		`),

		namedCase('accepts an abstract class method', `
			abstract class Example {
				abstract first(): void;

				abstract second(): void;

			}
		`),

		namedCase('accepts a commented method gap with one blank line', `
			class Example {
				first() {}

				// Explains the next method.
				second() {}

			}
		`),
	],

	invalid : [
		namedCase('adds missing blank lines between and after methods', {
			code : `
				class Example {
					first() {}
					second() {}
				}
			`,
			output : `
				class Example {
					first() {}

					second() {}

				}
			`,
			errors : [ { message : memberMessage }, { message : closingBraceMessage } ],
		}),

		namedCase('adds a missing blank line after the final setter', {
			code : `
				class Example {
					set value(value) {}
				}
			`,
			output : `
				class Example {
					set value(value) {}

				}
			`,
			errors : [ { message : closingBraceMessage } ],
		}),

		namedCase('removes a blank line between a getter and its matching setter', {
			code : `
				class Example {
					get value() { return 1; }

					set value(value) {}

				}
			`,
			output : `
				class Example {
					get value() { return 1; }
					set value(value) {}

				}
			`,
			errors : [ { message : getterSetterMessage } ],
		}),

		namedCase('removes extra blank lines between accessors and static methods', {
			code : `
				class Example {
					get value() { return 1; }



					static create() { return new Example(); }

				}
			`,
			output : `
				class Example {
					get value() { return 1; }

					static create() { return new Example(); }

				}
			`,
			errors : [ { message : memberMessage } ],
		}),

		namedCase('preserves a comment while fixing the final member gap', {
			code : `
				class Example {
					first() {}
					// Explains the next method.
					second() {}
				}
			`,
			output : `
				class Example {
					first() {}
					// Explains the next method.
					second() {}

				}
			`,
			errors : [ { message : memberMessage }, { message : closingBraceMessage } ],
		}),
	],
});
