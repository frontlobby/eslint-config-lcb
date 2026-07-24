import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import { MultilineTernary } from '../../../lib/rules/MultilineTernary.mts';
import { namedCase } from '../../../lib/utils.mts';

const ruleTester = new RuleTester({
	languageOptions : {
		ecmaVersion : 2022,
		parser,
		sourceType  : 'module',
	},
});

const splitMessage    = 'Ternary should be split over multiple lines when it exceeds the line limit';
const collapseMessage = 'Ternary should be on a single line when it fits within the line limit';

ruleTester.run('multiline-ternary', MultilineTernary.toEslintRule(), {
	valid : [
		namedCase('accepts a short single-line ternary', `
			const value = condition ? 'yes' : 'no';
		`),

		namedCase('accepts a single-line ternary that fits a custom maxLen', `
			const value = condition ? 'yes' : 'no';
		`, { options : [ { maxLen : 50 } ] }),

		namedCase('keeps a single-line ternary when line length is within the wrap buffer', {
			code    : 'const value = aaaaaaaaaaaaaaaaaaaaa ? b : c;',
			options : [ { maxLen : 40, maxLenBuffer : 5 } ],
		}),

		namedCase('leaves a multiline ternary when the collapsed statement exceeds the default limit', `
			const value = firstExtremelyLongConditionName
				? 'first fairly long truthy value'
				: 'first fairly long falsy value';
		`),

		namedCase('leaves a multiline ternary when a custom maxLen would be exceeded', `
			const value = condition
				? 'yes'
				: 'no';
		`, { options : [ { maxLen : 20 } ] }),

		namedCase('keeps a multiline ternary when collapsed line fits maxLen but is inside the unwrap buffer', `
			const val = ok
				? 'yes'
				: 'no';
		`, { options : [ { maxLen : 30, maxLenBuffer : 5 } ] }),

		namedCase('ignores nested ternary operands', `
			const value = condition ? (other ? 1 : 2) : 3;
		`),

		namedCase('ignores multiline operands', `
			const value = condition
				? foo(
					1
				)
				: 2;
		`),

		namedCase('ignores comments inside the ternary span', `
			const value = condition ? /* yes */ 'yes' : 'no';
		`),

		namedCase('ignores a long single-line ternary with leading prefix within wrap buffer', {
			code    : 'const p = \'ok\'; const value = aaaaaaaaaaaaaaaaaaaa ? b : c;',
			options : [ { maxLen : 54, maxLenBuffer : 5 } ],
		}),
	],

	invalid : [
		namedCase('collapses a multiline ternary within the default limit', {
			code : `
				const value = condition
					? 'yes'
					: 'no';
			`,
			output : `
				const value = condition ? 'yes' : 'no';
			`,
			errors : [ { message : collapseMessage } ],
		}),

		namedCase('collapses a multiline return ternary within the default limit', {
			code : `
				function getValue(condition) {
					return condition
						? 'yes'
						: 'no';
				}
			`,
			output : `
				function getValue(condition) {
					return condition ? 'yes' : 'no';
				}
			`,
			errors : [ { message : collapseMessage } ],
		}),

		namedCase('collapses a multiline ternary when collapsed line is below the unwrap buffer', {
			code    : 'const x = a\n\t? \'y\'\n\t: \'n\';',
			output  : 'const x = a ? \'y\' : \'n\';',
			options : [ { maxLen : 30, maxLenBuffer : 5 } ],
			errors  : [ { message : collapseMessage } ],
		}),

		namedCase('splits a single-line ternary when it exceeds the custom maxLen', {
			code : `
				const value = condition ? 'yes' : 'no';
			`,
			output : `
				const value = condition
					? 'yes'
					: 'no';
			`,
			options : [ { maxLen : 20 } ],
			errors  : [ { message : splitMessage } ],
		}),

		namedCase('splits a single-line ternary when line length exceeds the wrap buffer', {
			code : `
				const value = aaaaaaaaaaaaaaaaaaaaaaaaa ? b : c;
			`,
			output : `
				const value = aaaaaaaaaaaaaaaaaaaaaaaaa
					? b
					: c;
			`,
			options : [ { maxLen : 40, maxLenBuffer : 5 } ],
			errors  : [ { message : splitMessage } ],
		}),

		namedCase('splits based on the full line length', {
			code : `
				const prefix = 'long enough to matter'; const value = condition ? 'yes' : 'no';
			`,
			output : `
				const prefix = 'long enough to matter'; const value = condition
					? 'yes'
					: 'no';
			`,
			options : [ { maxLen : 60 } ],
			errors  : [ { message : splitMessage } ],
		}),

		namedCase('splits a long single-line assignment ternary', {
			code : `
				result = firstExtremelyLongConditionName ? 'truthy value' : 'falsy value';
			`,
			output : `
				result = firstExtremelyLongConditionName
					? 'truthy value'
					: 'falsy value';
			`,
			options : [ { maxLen : 60 } ],
			errors  : [ { message : splitMessage } ],
		}),
	],
});
