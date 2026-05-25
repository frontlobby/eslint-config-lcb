import { RuleTester } from 'eslint';

import rule from '../../../lib/rules/single-line-json-object.mjs';
import { namedCase } from '../../../lib/utils.mjs';

const ruleTester = new RuleTester({
	languageOptions : {
		ecmaVersion : 2022,
		sourceType  : 'script',
	},
});

ruleTester.run('single-line-json-object', rule, {
	valid : [
		namedCase('accepts an object that is already on one line', `
			const payload = { enabled : true, count : 2 };
		`),

		namedCase('accepts a single-line object that fits a custom maxLength', `
			const payload = { enabled : true, count : 2 };
		`, { options : [ { maxLength : 50 } ] }),

		namedCase('leaves a multiline object when the resulting statement exceeds the default limit', `
			const payload = {
				firstExtremelyLongPropertyName : 'first fairly long value',
				secondExtremelyLongPropertyName : 'second fairly long value',
			};
		`),

		namedCase('leaves a multiline object when a custom maxLength would be exceeded', `
			const payload = {
				enabled : true,
				count : 2,
			};
		`, { options : [ { maxLength : 30 } ] }),

		namedCase('ignores objects with comments inside them', `
			const payload = {
				// This should stay attached to the next property.
				enabled : true,
				count : 2,
			};
		`),

		namedCase('ignores objects with multiline non-object values', `
			const payload = {
				enabled : condition
					? true
					: false,
			};
		`),

		namedCase('leaves shorthand properties when a custom maxLength would be exceeded', `
			const payload = {
				enabled,
				firstExtremelyLongPropertyName : 'first fairly long value',
			};
		`, { options : [ { maxLength : 40 } ] }),
	],

	invalid : [
		namedCase('collapses a multiline object declaration within the default limit', {
			code : `
				const payload = {
					enabled : true,
					count : 2,
				};
			`,
			output : `
				const payload = { enabled : true, count : 2 };
			`,
			errors : [ { message : 'Object should be on a single line when it fits within the line limit' } ],
		}),

		namedCase('collapses nested objects and arrays as part of the same replacement', {
			code : `
				const payload = {
					user : {
						id : 123,
						name : 'Ada',
					},
					tags : [
						'admin',
						'billing',
					],
				};
			`,
			output : `
				const payload = { user : { id : 123, name : 'Ada' }, tags : [ 'admin', 'billing' ] };
			`,
			errors : [ { message : 'Object should be on a single line when it fits within the line limit' } ],
		}),

		namedCase('collapses object literals with non-json values', {
			code : `
				const payload = {
					enabled : isEnabled(),
					pattern : /abc/,
				};
			`,
			output : `
				const payload = { enabled : isEnabled(), pattern : /abc/ };
			`,
			errors : [ { message : 'Object should be on a single line when it fits within the line limit' } ],
		}),

		namedCase('collapses shorthand and spread properties', {
			code : `
				const payload = {
					enabled,
					...defaults,
					count : 2,
				};
			`,
			output : `
				const payload = { enabled, ...defaults, count : 2 };
			`,
			errors : [ { message : 'Object should be on a single line when it fits within the line limit' } ],
		}),

		namedCase('collapses computed properties', {
			code : `
				const payload = {
					[key] : value,
					count : 2,
				};
			`,
			output : `
				const payload = { [key] : value, count : 2 };
			`,
			errors : [ { message : 'Object should be on a single line when it fits within the line limit' } ],
		}),

		namedCase('honors a larger custom maxLength', {
			code : `
				const payload = {
					firstProperty : 'first value',
					secondProperty : 'second value',
				};
			`,
			output : `
				const payload = { firstProperty : 'first value', secondProperty : 'second value' };
			`,
			options : [ { maxLength : 120 } ],
			errors  : [ { message : 'Object should be on a single line when it fits within the line limit' } ],
		}),

		namedCase('includes the leading line content when checking maxLength', {
			code : `
				const prefix = 'long enough to matter'; const payload = {
					ok : true,
				};
			`,
			output : `
				const prefix = 'long enough to matter'; const payload = { ok : true };
			`,
			options : [ { maxLength : 80 } ],
			errors  : [ { message : 'Object should be on a single line when it fits within the line limit' } ],
		}),

		namedCase('splits a single-line object when it exceeds the custom maxLength', {
			code : `
				const payload = { enabled : true, count : 2 };
			`,
			output : `
				const payload = {
					enabled : true,
					count : 2,
				};
			`,
			options : [ { maxLength : 30 } ],
			errors  : [ { message : 'Object should be split over multiple lines when it exceeds the line limit' } ],
		}),

		namedCase('splits single-line shorthand and spread properties', {
			code : `
				const payload = { enabled, ...defaults, count : 2 };
			`,
			output : `
				const payload = {
					enabled,
					...defaults,
					count : 2,
				};
			`,
			options : [ { maxLength : 30 } ],
			errors  : [ { message : 'Object should be split over multiple lines when it exceeds the line limit' } ],
		}),

		namedCase('splits based on the full line length', {
			code : `
				const prefix = 'long enough to matter'; const payload = { ok : true };
			`,
			output : `
				const prefix = 'long enough to matter'; const payload = {
					ok : true,
				};
			`,
			options : [ { maxLength : 60 } ],
			errors  : [ { message : 'Object should be split over multiple lines when it exceeds the line limit' } ],
		}),
	],
});
