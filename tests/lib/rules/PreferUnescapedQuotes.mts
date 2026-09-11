/**
 * @fileoverview Prefer double quotes for strings that would otherwise escape a single quote
 */
import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import { PreferUnescapedQuotes } from '../../../lib/rules/PreferUnescapedQuotes.mts';
import { namedCase } from '../../../lib/utils.mts';

const ruleTester = new RuleTester({
	languageOptions : {
		ecmaVersion : 2022,
		parser,
		sourceType  : 'module',
	},
});

const message = "Use double quotes so the contained single quote doesn't have to be escaped";

ruleTester.run('prefer-unescaped-quotes', PreferUnescapedQuotes.toEslintRule(), {
	valid : [
		namedCase('accepts a single-quoted string with no apostrophe', String.raw`const label = 'Applicant';`),

		namedCase('accepts a string already written with double quotes', String.raw`const label = "the Applicant's account";`),

		namedCase('leaves a string containing a double quote alone', String.raw`const label = 'she said "no", so it\'s over';`),

		namedCase('leaves a string containing an escaped double quote alone', String.raw`const label = 'a \" and it\'s here';`),

		namedCase('ignores an escaped backslash at the end', String.raw`const path = 'C:\\';`),

		namedCase('ignores template literals', 'const label = `the Applicant\'s account`;'),

		namedCase('ignores non-string literals', String.raw`const count = 3;`),
	],

	invalid : [
		namedCase('rewrites a single escaped apostrophe', {
			code   : String.raw`const label = 'the Applicant\'s account';`,
			output : String.raw`const label = "the Applicant's account";`,
			errors : [ { message } ],
		}),

		namedCase('rewrites every escaped apostrophe in the string', {
			code   : String.raw`const label = 'don\'t and won\'t';`,
			output : String.raw`const label = "don't and won't";`,
			errors : [ { message } ],
		}),

		namedCase('keeps escapes that are not apostrophes', {
			code   : String.raw`const label = 'first line\nand it\'s second';`,
			output : String.raw`const label = "first line\nand it's second";`,
			errors : [ { message } ],
		}),

		namedCase('keeps an escaped backslash next to an escaped apostrophe', {
			code   : String.raw`const path = 'C:\\ and it\'s there';`,
			output : String.raw`const path = "C:\\ and it's there";`,
			errors : [ { message } ],
		}),

		namedCase('rewrites an object key', {
			code   : String.raw`const counts = { 'don\'t' : 1 };`,
			output : String.raw`const counts = { "don't" : 1 };`,
			errors : [ { message } ],
		}),

		namedCase('rewrites a string used as a type', {
			code   : String.raw`type Answer = 'don\'t';`,
			output : String.raw`type Answer = "don't";`,
			errors : [ { message } ],
		}),

		namedCase('reports each offending string separately', {
			code   : String.raw`const labels = [ 'it\'s', 'won\'t' ];`,
			output : String.raw`const labels = [ "it's", "won't" ];`,
			errors : [ { message }, { message } ],
		}),
	],
});
