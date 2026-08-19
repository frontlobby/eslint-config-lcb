/**
 * @fileoverview Align initialized class fields on their equals signs
 */
import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import { ClassFieldsAlignment } from '../../../lib/rules/ClassFieldsAlignment.mts';
import { namedCase } from '../../../lib/utils.mts';

const ruleTester = new RuleTester({
	languageOptions : {
		ecmaVersion : 2022,
		parser,
		sourceType  : 'module',
	},
});

ruleTester.run('align-class-fields', ClassFieldsAlignment.toEslintRule(), {
	valid : [
		namedCase('accepts aligned consecutive class fields', `
			class Settings {
				isReady        = false;
				maximumRetries = 3;
			}
		`),

		namedCase('keeps blank-line-separated groups independent', `
			class Settings {
				name = 'default';

				maximumRetries = 3;
				enabled        = true;
			}
		`),

		namedCase('does not align fields across a method', `
			class Settings {
				name = 'default';
				reset() {}
				maximumRetries = 3;
			}
		`),

		namedCase('does not align fields without initializers', `
			class Settings {
				name = 'default';
				maximumRetries: number;
				enabled = true;
			}
		`),

		namedCase('ignores multiline field initializers', `
			class Settings {
				maximumRetries = getDefault(
					3
				);
				enabled = true;
			}
		`),

		namedCase('accepts aligned typed and private fields', `
			class Settings {
				name: string            = 'default';
				#maximumRetries: number = 3;
			}
		`),

		namedCase('does not align fields beyond maxSpaces', `
			class Settings {
				thisFieldNameIsDeliberatelyVeryLong = 3;
				enabled = true;
			}
		`),

		namedCase('allows wider alignment when maxSpaces is increased', `
			class Settings {
				thisFieldNameIsDeliberatelyVeryLong = 3;
				enabled                             = true;
			}
		`, { options : [ { maxSpaces : 40 } ] }),
	],

	invalid : [
		namedCase('aligns consecutive class fields', {
			code : `
				class Settings {
					name = 'default';
					maximumRetries = 3;
					enabled = true;
				}
			`,
			output : `
				class Settings {
					name           = 'default';
					maximumRetries = 3;
					enabled        = true;
				}
			`,
			errors : createAlignmentErrors(2),
		}),

		namedCase('removes excess spacing between a class field and its initializer', {
			code : `
				class Settings {
					name             = 'default';
					maximumRetries   = 3;
				}
			`,
			output : `
				class Settings {
					name           = 'default';
					maximumRetries = 3;
				}
			`,
			errors : createAlignmentErrors(2),
		}),

		namedCase('aligns TypeScript class fields', {
			code : `
				class Settings {
					name: string = 'default';
					maximumRetries: number = 3;
				}
			`,
			output : `
				class Settings {
					name: string           = 'default';
					maximumRetries: number = 3;
				}
			`,
			errors : createAlignmentErrors(1),
		}),
	],
});

function createAlignmentErrors(count: number) {
	return Array.from({ length : count }, () => ({ message : 'Class field initializers should be aligned' }));
}
