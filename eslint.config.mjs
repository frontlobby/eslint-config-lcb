/**
 * ESLint config for this repository only (not published to consumers).
 *
 * Extends the same base config we ship, then adds Node/TypeScript language options for
 * .mjs and .mts sources. Rule implementation files under lib/ use relaxed rules where
 * AST traversal idioms would otherwise be noisy (e.g. non-null assertions).
 */
import tsParser from '@typescript-eslint/parser';
import globals  from 'globals';

import { config as lcbBase } from './baseRules.mjs';

const ruleSourceFiles = [ 'lib/**/*.mts', 'eslintLocalRules.mts' ];

const ruleSourceRelaxations = {
	'@typescript-eslint/no-non-null-assertion' : 'off',
	'@typescript-eslint/no-this-alias'         : 'off',
	'@typescript-eslint/no-unused-vars'        : [ 'error', { argsIgnorePattern : '^_' } ],
	'no-useless-assignment'                    : 'off',
};

export default [
	{
		ignores : [ 'tests/**' ],
	},
	...lcbBase,
	{
		files           : [ '**/*.mjs' ],
		languageOptions : {
			ecmaVersion : 2018,
			sourceType  : 'module',
			globals     : globals.node,
		},
	},
	{
		files           : [ '**/*.mts' ],
		languageOptions : {
			ecmaVersion   : 'latest',
			sourceType    : 'module',
			parser        : tsParser,
			parserOptions : {
				sourceType : 'module',
			},
			globals : globals.node,
		},
	},
	{
		files : ruleSourceFiles,
		rules : ruleSourceRelaxations,
	},
];
