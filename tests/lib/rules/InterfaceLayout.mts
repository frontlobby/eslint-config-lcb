/**
 * @fileoverview Lay out TypeScript interface declarations
 */
import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import { InterfaceLayout } from '../../../lib/rules/InterfaceLayout.mts';
import { namedCase } from '../../../lib/utils.mts';

const ruleTester = new RuleTester({
	languageOptions : {
		ecmaVersion : 2022,
		parser,
		sourceType  : 'module',
	},
});

const align     = { message : 'Interface fields should be aligned on their colons' };
const blankLine = { message : 'Unexpected blank line between interface fields' };
const comment   = { message : 'Interface field comments should be JSDoc comments above the field' };
const expand    = { message : 'Inline object types should be split over multiple lines' };

ruleTester.run('interface-layout', InterfaceLayout.toEslintRule(), {
	valid : [
		namedCase('accepts aligned fields', dedent(`
			interface User {
				id                 : string;
				nickname?          : string;
				readonly createdAt : Date;
				[Symbol.iterator]  : () => void;
			}
		`)),

		namedCase('accepts a single field with one space before its colon', dedent(`
			interface User {
				id : string;
			}
		`)),

		namedCase('leaves single-line interfaces alone', dedent(`
			interface Point { x: number; y: number }
			interface Empty {}
		`)),

		namedCase('accepts an expanded inline object type with aligned members', dedent(`
			interface SidebarSubitem {
				meta : {
					title       : string;
					dataAutoId? : string;
					icon?       : string;
				};
				path : string;
			}
		`)),

		namedCase('accepts an empty inline object type', dedent(`
			interface Options {
				extra : {};
			}
		`)),

		namedCase('accepts a laid-out inline object type on a class field', dedent(`
			class GetResidentData {
				result: {
					summary?    : {
						totalTenants? : number;
					};
					leaseFiles? : {
						identification? : string[];
					}[];
				};
			}
		`)),

		namedCase('ignores inline object types outside interfaces', dedent(`
			type Point = { x: number; y: number };
			function move(point: { x: number; y: number }) {}
		`)),

		namedCase('aligns fields and index signatures across methods', dedent(`
			interface Store {
				name          : string;
				[key: string] : unknown;
				reset(): void;
				size          : number;
			}
		`)),

		namedCase('leaves fields with a comment beside the colon as written', dedent(`
			interface User {
				id        : string;
				name /* display */: string;
				nickname? : string;
				age: /* years */ number;
			}
		`)),

		namedCase('accepts a one-line JSDoc above the field', dedent(`
			interface User {
				/** Primary key */
				id   : string;
				name : string;
			}
		`)),

		namedCase('accepts a multi-line JSDoc with a blank line and a tag', dedent(`
			interface User {
				/**
				 * The display name.
				 *
				 * @deprecated Use nickname.
				 */
				name : string;
			}
		`)),

		namedCase('keeps the multi-line form when the single line would not fit', dedent(`
			interface User {
				/**
				 * The display name chosen by the user
				 */
				name : string;
			}
		`), { options : [ { maxLen : 30 } ] }),

		namedCase('accepts a JSDoc above a multi-line field', dedent(`
			interface User {
				/** Display settings */
				meta : {
					title : string;
				};
			}
		`)),

		namedCase('leaves directive comments, and the other comments on their field, alone', dedent(`
			interface User {
				// Legacy name
				// @ts-expect-error legacy field
				name  : string;
				/* eslint-disable-next-line */
				age   : number;
				// #region extra
				extra : string; // eslint-disable-line no-magic-numbers
				// #endregion
			}
		`)),

		namedCase('leaves comments before the closing brace alone', dedent(`
			interface User {
				id : string;
				// More fields to come
				/* Or maybe not */
			}
		`)),
	],

	invalid : [
		namedCase('aligns colons with at least one space before them', {
			code : dedent(`
				interface User {
					id: string;
					nickname?: string;
				}
			`),
			output : dedent(`
				interface User {
					id        : string;
					nickname? : string;
				}
			`),
			errors : [ align, align ],
		}),

		namedCase('aligns an index signature on the colon after its brackets', {
			code : dedent(`
				interface ApiCall {
					api?        : string;
					sectionGid? : string;
					taskGid?    : string;
					opts?       : unknown;
					[key: string]: unknown;
				}
			`),
			output : dedent(`
				interface ApiCall {
					api?          : string;
					sectionGid?   : string;
					taskGid?      : string;
					opts?         : unknown;
					[key: string] : unknown;
				}
			`),
			errors : [ align, align, align, align, align ],
		}),

		namedCase('removes excess padding and collapses spaces after the colon', {
			code : dedent(`
				interface User {
					id          :    string;
					name        : string;
				}
			`),
			output : dedent(`
				interface User {
					id   : string;
					name : string;
				}
			`),
			errors : [ align, align ],
		}),

		namedCase('aligns the other fields around fields with a comment beside the colon', {
			code : dedent(`
				interface User {
					id: string;
					name /* display */: string;
					nickname?   :   string;
					age: /* years */ number;
				}
			`),
			output : dedent(`
				interface User {
					id        : string;
					name /* display */: string;
					nickname? : string;
					age: /* years */ number;
				}
			`),
			errors : [ align, align ],
		}),

		namedCase('removes blank lines between fields and comments', {
			code : dedent(`
				interface User {
					id   : string;

					/** Display name */

					name : string;
				}
			`),
			output : dedent(`
				interface User {
					id   : string;
					/** Display name */
					name : string;
				}
			`),
			errors : [ blankLine, blankLine ],
		}),

		namedCase('expands an inline object type', {
			code : dedent(`
				interface SidebarSubitem {
					meta : { title: string; dataAutoId?: string, icon?: string };
					path : string;
				}
			`),
			output : dedent(`
				interface SidebarSubitem {
					meta : {
						title: string;
						dataAutoId?: string;
						icon?: string;
					};
					path : string;
				}
			`),
			errors : [ expand ],
		}),

		namedCase('aligns the members of an expanded inline object type', {
			code : dedent(`
				interface SidebarSubitem {
					meta : {
						title: string;
						dataAutoId?: string;
						icon?: string;
					};
					path : string;
				}
			`),
			output : dedent(`
				interface SidebarSubitem {
					meta : {
						title       : string;
						dataAutoId? : string;
						icon?       : string;
					};
					path : string;
				}
			`),
			errors : [ align, align, align ],
		}),

		namedCase('expands a partly expanded inline object type', {
			code : dedent(`
				interface Options {
					meta : { title : string;
						icon? : string };
				}
			`),
			output : dedent(`
				interface Options {
					meta : {
						title : string;
						icon? : string;
					};
				}
			`),
			errors : [ expand ],
		}),

		namedCase('expands inline object types nested in inline object types', {
			code : dedent(`
				interface Options {
					meta : {
						link : { href: string };
					};
				}
			`),
			output : dedent(`
				interface Options {
					meta : {
						link : {
							href: string;
						};
					};
				}
			`),
			errors : [ expand ],
		}),

		namedCase('aligns the inline object types of a class field, through arrays', {
			code : dedent(`
				class GetResidentData {
					result: {
						summary?: {
							generationTimeStamp?: string;
							totalTenants?: number;
						};
						leaseFiles?: {
							identification?: string[];
						}[];
					};
				}
			`),
			output : dedent(`
				class GetResidentData {
					result: {
						summary?    : {
							generationTimeStamp? : string;
							totalTenants?        : number;
						};
						leaseFiles? : {
							identification? : string[];
						}[];
					};
				}
			`),
			errors : [ align, align, align, align, align ],
		}),

		namedCase('expands an inline object type on a class field', {
			code : dedent(`
				class Settings {
					theme: { name: string; dark: boolean } = { name : 'default', dark : false };
				}
			`),
			output : dedent(`
				class Settings {
					theme: {
						name: string;
						dark: boolean;
					} = { name : 'default', dark : false };
				}
			`),
			errors : [ expand ],
		}),

		namedCase('expands an array of inline object types', {
			code : dedent(`
				interface Lease {
					tenants : { name: string; email?: string }[];
				}
			`),
			output : dedent(`
				interface Lease {
					tenants : {
						name: string;
						email?: string;
					}[];
				}
			`),
			errors : [ expand ],
		}),

		namedCase('moves a trailing // comment above the field as a one-line JSDoc', {
			code : dedent(`
				interface User {
					id   : string; // Primary key
					name : string;
				}
			`),
			output : dedent(`
				interface User {
					/** Primary key */
					id   : string;
					name : string;
				}
			`),
			errors : [ comment ],
		}),

		namedCase('turns two // lines above the field into a two-line JSDoc', {
			code : dedent(`
				interface User {
					// The display name,
					// chosen by the user
					name : string;
				}
			`),
			output : dedent(`
				interface User {
					/**
					 * The display name,
					 * chosen by the user
					 */
					name : string;
				}
			`),
			errors : [ comment ],
		}),

		namedCase('turns a block comment above the field into a JSDoc', {
			code : dedent(`
				interface User {
					/* Primary key */
					id : string;
				}
			`),
			output : dedent(`
				interface User {
					/** Primary key */
					id : string;
				}
			`),
			errors : [ comment ],
		}),

		namedCase('moves a trailing block comment above the field as a JSDoc', {
			code : dedent(`
				interface User {
					id : string; /* Primary key */
				}
			`),
			output : dedent(`
				interface User {
					/** Primary key */
					id : string;
				}
			`),
			errors : [ comment ],
		}),

		namedCase('collapses a multi-line JSDoc with one line of text', {
			code : dedent(`
				interface User {
					/**
					 * Primary key
					 */
					id : string;
				}
			`),
			output : dedent(`
				interface User {
					/** Primary key */
					id : string;
				}
			`),
			errors : [ comment ],
		}),

		namedCase('uses the multi-line form when the single line does not fit', {
			code : dedent(`
				interface User {
					// The display name chosen by the user
					name : string;
				}
			`),
			output : dedent(`
				interface User {
					/**
					 * The display name chosen by the user
					 */
					name : string;
				}
			`),
			options : [ { maxLen : 30 } ],
			errors  : [ comment ],
		}),

		namedCase('merges a comment above and a trailing comment into one JSDoc', {
			code : dedent(`
				interface User {
					// Primary key
					id : string; // Never empty
				}
			`),
			output : dedent(`
				interface User {
					/**
					 * Primary key
					 * Never empty
					 */
					id : string;
				}
			`),
			errors : [ comment ],
		}),

		namedCase('keeps an @deprecated tag and a blank line when converting a block comment', {
			code : dedent(`
				interface User {
					/*
					 * The display name.
					 *
					 * @deprecated Use {@link User.nickname}.
					 */
					name : string;
				}
			`),
			output : dedent(`
				interface User {
					/**
					 * The display name.
					 *
					 * @deprecated Use {@link User.nickname}.
					 */
					name : string;
				}
			`),
			errors : [ comment ],
		}),

		namedCase('moves a comment on the opening brace line above the first field', {
			code : dedent(`
				interface User { // The display name chosen by the user
					name : string;
				}
			`),
			output : dedent(`
				interface User {
					/** The display name chosen by the user */
					name : string;
				}
			`),
			errors : [ comment ],
		}),

		namedCase('aligns fields and converts the comments above them in one pass', {
			code : dedent(`
				interface User {
					// Primary key
					id: string;
					// Display name
					name: string;
				}
			`),
			output : dedent(`
				interface User {
					/** Primary key */
					id   : string;
					/** Display name */
					name : string;
				}
			`),
			errors : [ comment, align, comment, align ],
		}),

		namedCase('converts the comments of a field in an inline object type', {
			code : dedent(`
				interface Options {
					meta : {
						title : string; // Shown in the tab
					};
				}
			`),
			output : dedent(`
				interface Options {
					meta : {
						/** Shown in the tab */
						title : string;
					};
				}
			`),
			errors : [ comment ],
		}),

		namedCase('converts the comments of a field in the inline object type of a class field', {
			code : dedent(`
				class Settings {
					theme: {
						// Theme name
						name : string;
					};
				}
			`),
			output : dedent(`
				class Settings {
					theme: {
						/** Theme name */
						name : string;
					};
				}
			`),
			errors : [ comment ],
		}),
	],
});

/** Strip the indentation shared by every non-blank line, so test code reads like source. */
function dedent(code: string): string {
	const lines  = code.replace(/^\n/, '').replace(/\n\s*$/, '').split('\n');
	const indent = Math.min(...lines.filter(line => line.trim()).map(line => line.match(/^\t*/)![0].length));

	return lines.map(line => line.slice(indent)).join('\n');
}
