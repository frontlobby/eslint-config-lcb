/**
 * Published package entry point for consumer projects.
 *
 * Re-exports the full FrontLobby ESLint flat config from baseRules.mjs and adds a typed overlay
 * (TypeScript project service + no-floating-promises) for *.{ts,tsx,vue} files.
 *
 * Usage: import { config } from '@frontlobby/eslint-config-lcb';
 * Base-only: import { base } from '@frontlobby/eslint-config-lcb';
 */
import { config as baseConfig } from './baseRules.mjs';

const typedRules = { '@typescript-eslint/no-floating-promises' : [ 'error', { ignoreVoid : true, ignoreIIFE : true } ] };

export const config = [
	...baseConfig,
	{
		name            : '@frontlobby/eslint-config-lcb/typed',
		files           : [ '**/*.{ts,tsx,vue}' ],
		languageOptions : {
			parserOptions : {
				projectService : true,
			},
		},
		rules : typedRules,
	},
];

export { config as base } from './baseRules.mjs';
