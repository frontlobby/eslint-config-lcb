import globals from 'globals';

import lcbConfig from './index.mjs';

export default [
	...lcbConfig,
	{
		languageOptions : {
			ecmaVersion : 6,
			sourceType  : 'module',
			parserOptions : {
				ecmaFeatures : {
					globalReturn : true, // NOTE: apparently doesn't work yet: https://github.com/feross/standard/issues/167
				},
			},
			globals : globals.node,
		},
	},
];
