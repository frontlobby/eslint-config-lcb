/**
 * @fileoverview Align assignment statements on their equals signs
 */
import { RuleTester } from 'eslint';

import rule from '../../../lib/rules/align-assign.mjs';
import { namedCase } from '../../../lib/utils.mjs';

const ruleTester = new RuleTester({
	languageOptions : {
		ecmaVersion : 2022,
		sourceType  : 'script',
	},
});

ruleTester.run('align-assign', rule, {
	valid : [
		namedCase('accepts already aligned consecutive assignments', `
			var a    = 1;
			var b    = 3;
			var asdf = 4;
			b        = 4;
		`),

		namedCase('accepts aligned assignment after chained assignment', `
			var a = b = c;
			a     = 3;
		`),

		namedCase('accepts aligned assignments inside a function body', `
			function f() {
				var a = 3;
				a     = 5;
			}
		`),

		namedCase('ignores additional declarators on the same line', `
			var a = 3, b = 5, c = 7;
			a     = 2;
		`),

		namedCase('treats blank lines as separate alignment groups', `
			var a = 3;

			a = 4;`
		),

		namedCase('ignores multiline comments that share the line', `
			var a = 3 /*who would make
			a comment like this anyways*/a = 5
		`),

		namedCase('ignores trailing line comments when checking alignment', `
			var a = 4; // a comment
			a     = 3;
		`),

		namedCase('ignores assignments that share a line with another statement', `
			var a = 3; a = 3;
			a = 2;
		`),

		namedCase('accepts aligned assignments inside a block', `
			{
				var a = 3;
				a     = 4;
			}
		`),

		// If the alignment would happen between two lines that have different indentations,
		// it shouldn't bother trying to align since the alignment would look different for different people
		// eg:
		// aligned for person with tab=4
		/*
		{ var a = 3;
		    a   = 4;
		}
		 */
		// exact same code for person with tab=2
		/*
		{ var a = 3;
		  a   = 4;
		}
		*/
		namedCase('skips alignment across lines with different indentation', `
			{ var a = 3;
				a = 4;
			}
		`),

		namedCase('accepts aligned member-expression assignments', `
			a.b.c.d = 3;
			a.b     = 5;
		`),

		namedCase('aligns using the first initialized declarator in a statement', `
			var a, b, c, d = 3;
			var f          = 5;
		`),

		namedCase('accepts mixed declarators when one initializer determines alignment', `
			var a, b = 4, c, d = 3;
			var f    = 5;
		`),

		namedCase('ignores declarations without any initializer', `
			var a, b, c, d;
			var f = 5;
		`),

		namedCase('accepts aligned variable and compound assignments', `
			var a  = 4;
			b     += 7;
		`),

		namedCase('accepts compound assignment followed by plain assignment', `
			asdf += 4;
			b     = 7;
		`),

		namedCase('accepts operators with different widths when aligned', `
			var a    = 4;
			b     >>>= 7;
		`),

		namedCase('accepts assignment before a function expression', `
			var a  = 1;
			var ab = function() {
				return 1;
			};
		`),

		namedCase('ignores multiline declarations after a longer identifier', `
			asdfasdfasdf = 3;
			var a,
				b,
				c,
				d = 3;
		`),

		namedCase('accepts assignments inside computed member expressions', `
			a[b = 'asdf'] = 5;
			b             = 2;
		`),

		namedCase('treats overly wide alignment as separate blocks by default', `
			thisVariableHas27Characters = 2;
			b = 3;
		`),

		namedCase('accepts wide alignment when maxSpaces is increased', `
			thisVariableHas22Chars = 2;
			b                      = 3;
		`, { options : [ { maxSpaces : 40 } ] } ),

		namedCase('treats wide alignment as separate blocks when maxSpaces is smaller', `
			thisVariableHas22Chars = 2;
			b = 3;
		`, { options : [ { maxSpaces : 20 } ] } ),
	],
	invalid : [
		namedCase('fixes under-aligned consecutive variable declarations', {
			code : `
				var a = 1;
				var b = 3;
				var asdf = 4;
				b = 4;
			`,
			output : `
				var a    = 1;
				var b    = 3;
				var asdf = 4;
				b        = 4;
			`,
			errors : createAlignmentErrors(3),
		}),
		namedCase('fixes over-aligned consecutive variable declarations', {
			code : `
				var a     = 1;
				var b     = 3;
				var asdf  = 4;
				b         = 4;
			`,
			output : `
				var a    = 1;
				var b    = 3;
				var asdf = 4;
				b        = 4;
			`,
			errors : createAlignmentErrors(4),
		}),
		namedCase('removes extra spaces when a blank line splits alignment blocks', {
			code : `
				var a = 1;

				a     = 2;
			`,
			output : `
				var a = 1;

				a = 2;
			`,
			errors : createAlignmentErrors(1),
		}),
		namedCase('aligns a shorter member-expression assignment', {
			code : `
				a.b.c.d = 4;
				a.b = 3;
			`,
			output : `
				a.b.c.d = 4;
				a.b     = 3;
			`,
			errors : createAlignmentErrors(1),
		}),
		namedCase('aligns assignments inside a function body', {
			code : `
				function f() {
					var a = 1;
					a = 2;
				}
			`,
			output : `
				function f() {
					var a = 1;
					a     = 2;
				}
			`,
			errors : createAlignmentErrors(1),
		}),
		namedCase('removes alignment across lines with different indentation', {
			code : `
				{ var a = 1;
					a     = 2;
				}
			`,
			output : `
				{ var a = 1;
					a = 2;
				}
			`,
			errors : createAlignmentErrors(1),
		}),
		namedCase('aligns declarations after a mixed initialized declarator statement', {
			code : `
				var a, b, c = 3, d;
				var f = 5;
			`,
			output : `
				var a, b, c = 3, d;
				var f       = 5;
			`,
			errors : createAlignmentErrors(1),
		}),
		namedCase('collapses over-wide alignment into separate blocks', {
			code : `
				thisVariableHas27Characters += 2;
				b                            = 3;
			`,
			output : `
				thisVariableHas27Characters += 2;
				b = 3;
			`,
			errors : createAlignmentErrors(1),
		}),
		namedCase('aligns plain and compound assignment operators together', {
			code : `
				var a = 2;
				b    += 3;
			`,
			output : `
				var a  = 2;
				b     += 3;
			`,
			errors : createAlignmentErrors(2),
		}),
	],
});

function createAlignmentErrors(count) {
	return Array.from({ length : count }, () => ({ message : 'Assignments should be aligned' }));
}
