/**
 * @fileoverview @stylistic/type-annotation-spacing, deferring to interface-layout on aligned interface fields
 */
import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import { TypeAnnotationSpacing } from '../../../lib/rules/TypeAnnotationSpacing.mts';
import { namedCase } from '../../../lib/utils.mts';

const ruleTester = new RuleTester({
	languageOptions : {
		ecmaVersion : 2022,
		parser,
		sourceType  : 'module',
	},
});

ruleTester.run('type-annotation-spacing', TypeAnnotationSpacing.toEslintRule(), {
	valid : [
		namedCase('accepts padding before the colons of aligned interface fields', `
interface SidebarSubitem {
	meta : {
		title       : string;
		dataAutoId? : string;
	};
	path : string;
}
		`),

		namedCase('accepts padding before the colon of an aligned index signature', `
interface ApiCall {
	api?          : string;
	[key: string] : unknown;
}
		`),

		namedCase('accepts padding inside an inline object type on a class field', `
class GetResidentData {
	result: {
		summary?    : string;
		leaseFiles? : {
			identification? : string[];
		}[];
	};
}
		`),

		namedCase('accepts unpadded annotations elsewhere', `
let count: number;
function greet(name: string): void {}
class User { name: string; }
interface Point { x: number; y: number }
		`),
	],

	invalid : [
		namedCase('still reports space before a class field colon', {
			code   : 'class User { name : string; }',
			output : 'class User { name: string; }',
			errors : [ { messageId : 'unexpectedSpaceBefore' } ],
		}),

		namedCase('still reports space before the colon of a class field with an inline object type', {
			code   : 'class Data {\n\tresult : {\n\t\tid : string;\n\t};\n}',
			output : 'class Data {\n\tresult: {\n\t\tid : string;\n\t};\n}',
			errors : [ { messageId : 'unexpectedSpaceBefore' } ],
		}),

		namedCase('still reports space before a parameter colon', {
			code   : 'function greet(name : string) {}',
			output : 'function greet(name: string) {}',
			errors : [ { messageId : 'unexpectedSpaceBefore' } ],
		}),

		namedCase('still reports space before the colons of a single-line interface', {
			code   : 'interface Point { x : number; y? : number }',
			output : 'interface Point { x: number; y?: number }',
			errors : [ { messageId : 'unexpectedSpaceBefore' }, { messageId : 'unexpectedSpaceBetween' } ],
		}),

		namedCase('still reports space before the colon inside index signature brackets', {
			code   : 'interface ApiCall {\n\tapi?           : string;\n\t[key : string] : unknown;\n}',
			output : 'interface ApiCall {\n\tapi?           : string;\n\t[key: string] : unknown;\n}',
			errors : [ { messageId : 'unexpectedSpaceBefore' } ],
		}),

		namedCase('still reports a missing space after an aligned field colon', {
			code   : 'interface User {\n\tid :string;\n}',
			output : 'interface User {\n\tid : string;\n}',
			errors : [ { messageId : 'expectedSpaceAfter' } ],
		}),
	],
});
