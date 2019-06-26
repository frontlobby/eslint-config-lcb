/**
 * @fileoverview Align assignment statements on their equals signs
 */
'use strict';

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const RuleTester = require('eslint').RuleTester;
const rule       = require('../../../lib/rules/align-assign');

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

const ruleTester = new RuleTester();
ruleTester.run('align-assign', rule, {
	valid : [
		`
		var a    = 1;
		var b    = 3;
		var asdf = 4;
		b        = 4;`,
		`
		var a = b = c;
		a     = 3;`,
		`
		function f() {
			var a = 3;
			a     = 5;
		}`,
		`
		var a = 3, b = 5, c = 7;
		a     = 2;`,
		`
		var a = 3;

		a = 4;`,
		`
		var a = 3 /*who would make
		a comment like this anyways*/a = 5`,
		`
		var a = 4; // a comment
		a     = 3;`,
		`
		var a = 3; a = 3;
		a = 2;`,
		`
		{
			var a = 3;
			a     = 4;
		}`,
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
		`
		{ var a = 3;
			a = 4;
		}`,
		`
		a.b.c.d = 3;
		a.b     = 5;`,
		`
		var a, b, c, d = 3;
		var f          = 5;`,
		`
		var a, b = 4, c, d = 3;
		var f    = 5;`,
		`
		var a, b, c, d;
		var f = 5;`,
		`
		var a  = 4;
		b     += 7;`,
		`
		asdf += 4;
		b     = 7;`,
		`
		var a    = 4;
		b     >>>= 7;`,
		`
		var a  = 1;
		var ab = function() {
			return 1;
		};`,
		`
		asdfasdfasdf = 3;
		var a,
			b,
			c,
			d = 3;`,
		`
		a[b = 'asdf'] = 5;
		b             = 2;`,
		`
		thisVariableHas27Characters = 2;
		b = 3;
		`,
		{
			code : `
			thisVariableHas22Chars = 2;
			b                      = 3;
			`,
			options : [ { maxSpaces : 40 } ],
		},
		{
			code : `
			thisVariableHas22Chars = 2;
			b = 3;
			`,
			options : [ { maxSpaces : 20 } ],
		},
	],
	invalid : [
		{
			code : `
			var a = 1;
			var b = 3;
			var asdf = 4;
			b = 4;`,
			errors : [ {}, {}, {} ],
			output : `
			var a    = 1;
			var b    = 3;
			var asdf = 4;
			b        = 4;`,
		},
		{
			code : `
			var a     = 1;
			var b     = 3;
			var asdf  = 4;
			b         = 4;`,
			errors : [ {}, {}, {}, {} ],
			output : `
			var a    = 1;
			var b    = 3;
			var asdf = 4;
			b        = 4;`,
		},
		{
			code : `
			var a = 1;

			a     = 2;`,
			errors : [ {} ],
			output : `
			var a = 1;

			a = 2;`,
		},
		{
			code : `
			a.b.c.d = 4;
			a.b = 3;`,
			errors : [ {} ],
			output : `
			a.b.c.d = 4;
			a.b     = 3;`,
		},
		{
			code : `
			function f() {
				var a = 1;
				a = 2;
			}`,
			errors : [ {} ],
			output : `
			function f() {
				var a = 1;
				a     = 2;
			}`,
		},
		{
			code : `
			{ var a = 1;
				a     = 2;
			}`,
			errors : [ {} ],
			output : `
			{ var a = 1;
				a = 2;
			}`,
		},
		{
			code : `
			var a, b, c = 3, d;
			var f = 5;`,
			errors : [ {} ],
			output : `
			var a, b, c = 3, d;
			var f       = 5;`,
		},
		{
			code : `
			thisVariableHas27Characters += 2;
			b                            = 3;`,
			errors : [ {} ],
			output : `
			thisVariableHas27Characters += 2;
			b = 3;`,
		},
		{
			code : `
			var a = 2;
			b    += 3;`,
			errors : [ {}, {} ],
			output : `
			var a  = 2;
			b     += 3;`,
		},
	],
});
