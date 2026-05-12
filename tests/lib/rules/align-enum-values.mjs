/**
 * @fileoverview Align TypeScript enum members on their equals signs
 */
import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import rule from '../../../lib/rules/align-enum-values.mjs';
import { namedCase } from '../../../lib/utils.mjs';

const ruleTester = new RuleTester({
	languageOptions : {
		ecmaVersion : 2022,
		parser,
		sourceType  : 'module',
	},
});

ruleTester.run('align-enum-values', rule, {
	valid : [
		namedCase('accepts already aligned enum values', `
			enum Status {
				Ok      = 'ok',
				Pending = 'pending',
			}
		`),

		namedCase('accepts a single initialized member', `
			enum Status {
				Ok = 'ok',
			}
		`),

		namedCase('accepts initialized members aligned around uninitialized members', `
			enum Status {
				Ok      = 'ok',
				Unknown,
				Pending = 'pending',
			}
		`),

		namedCase('keeps separate enums independent', `
			enum Status {
				Ok      = 'ok',
				Pending = 'pending',
			}

			enum Direction {
				Up   = 1,
				Down = 2,
			}
		`),

		namedCase('accepts aligned string-literal enum keys', `
			enum Header {
				'X-Id'      = 'x-id',
				'X-Request' = 'x-request',
			}
		`),

		namedCase('ignores multiline initializers', `
			enum Status {
				Longer = someFunction(
					'pending'
				),
				Ok = 'ok',
			}
		`),

		namedCase('accepts aligned members when values are separated by comment lines', `
			enum Status {
				Ok      = 'ok',
				// wait states
				// (comments do not reset alignment)
				Pending = 'pending',
			}
		`),

		namedCase('accepts single-line enum with one space on each side of equals', `
			enum Status { Ok = 'ok', Pending = 'pending' }
		`),

		namedCase('accepts single-line enum when braces wrap to other lines but members share one line', `
			enum Status {
				Ok = 'ok', Pending = 'pending',
			}
		`),
	],

	invalid : [
		namedCase('aligns an under-aligned enum member', {
			code : `
				enum Status {
					Ok = 'ok',
					Pending = 'pending',
				}
			`,
			output : `
				enum Status {
					Ok      = 'ok',
					Pending = 'pending',
				}
			`,
			errors : createAlignmentErrors(1),
		}),

		namedCase('removes over-padding from enum members', {
			code : `
				enum Status {
					Ok          = 'ok',
					Pending     = 'pending',
				}
			`,
			output : `
				enum Status {
					Ok      = 'ok',
					Pending = 'pending',
				}
			`,
			errors : createAlignmentErrors(2),
		}),

		namedCase('aligns initialized members while ignoring uninitialized members', {
			code : `
				enum Status {
					Ok = 'ok',
					Unknown,
					Pending = 'pending',
				}
			`,
			output : `
				enum Status {
					Ok      = 'ok',
					Unknown,
					Pending = 'pending',
				}
			`,
			errors : createAlignmentErrors(1),
		}),

		namedCase('aligns string-literal enum keys', {
			code : `
				enum Header {
					'X-Id' = 'x-id',
					'X-Request' = 'x-request',
				}
			`,
			output : `
				enum Header {
					'X-Id'      = 'x-id',
					'X-Request' = 'x-request',
				}
			`,
			errors : createAlignmentErrors(1),
		}),

		namedCase('aligns members across comment lines as one block', {
			code : `
				enum Status {
					Ok = 'ok',
					// wait states
					// (alignment column ignores these lines)
					Pending = 'pending',
				}
			`,
			output : `
				enum Status {
					Ok      = 'ok',
					// wait states
					// (alignment column ignores these lines)
					Pending = 'pending',
				}
			`,
			errors : createAlignmentErrors(1),
		}),

		namedCase('single-line enum: fixes missing spaces around equals', {
			code : `
				enum Status { Ok='ok', Pending = 'pending' }
			`,
			output : `
				enum Status { Ok = 'ok', Pending = 'pending' }
			`,
			errors : createSpacingErrors(1),
		}),

		namedCase('single-line enum: fixes both members when spacing is wrong', {
			code : `
				enum Status { Ok='ok', Pending='pending' }
			`,
			output : `
				enum Status { Ok = 'ok', Pending = 'pending' }
			`,
			errors : createSpacingErrors(2),
		}),

		namedCase('single-line enum: collapses extra spaces around equals', {
			code : `
				enum Status { Ok  =  'ok', Pending = 'pending' }
			`,
			output : `
				enum Status { Ok = 'ok', Pending = 'pending' }
			`,
			errors : createSpacingErrors(1),
		}),

		namedCase('single-line enum: fixes one member on one line', {
			code : `
				enum Status { Ok='ok' }
			`,
			output : `
				enum Status { Ok = 'ok' }
			`,
			errors : createSpacingErrors(1),
		}),
	],
});

function createAlignmentErrors(count) {
	return Array.from({ length : count }, () => ({ message : 'Enum values should be aligned' }));
}

function createSpacingErrors(count) {
	return Array.from({ length : count }, () => ({
		message : 'Use a single space on each side of \'=\' in a single-line enum',
	}));
}

