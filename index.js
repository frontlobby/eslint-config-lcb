module.exports = {
	extends : [
		'plugin:vue/recommended',
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended', // typescript extensions
	],

	parser : require.resolve('vue-eslint-parser'),

	parserOptions : {
		parser      : require.resolve('@typescript-eslint/parser'),
		ecmaVersion : 2018,
	},

	env : { es6 : true },

	plugins : [
		'@typescript-eslint',
		'eslint-plugin-local-rules',
	],

	rules : {
		// Possible Errors
		'no-cond-assign'           : 'error',
		'no-constant-condition'    : 'error',
		'no-debugger'              : 'error',	// should be "error" in production builds
		'no-dupe-args'             : 'error',
		'no-dupe-keys'             : 'error',
		'no-duplicate-case'        : 'error',
		'no-empty-character-class' : 'error',
		'no-extra-boolean-cast'    : 'error',
		'no-func-assign'           : 'error',
		'no-inner-declarations'    : 'error',
		'no-invalid-regexp'        : 'error',
		'no-irregular-whitespace'  : 'error',
		'no-negated-in-lhs'        : 'error',
		'no-obj-calls'             : 'error',
		'valid-typeof'             : 'error',

		// Best Practices
		'no-eval'               : 'error',
		'no-else-return'        : [ 'error', { allowElseIf : false } ],
		'no-loop-func'          : 'error',
		'no-implied-eval'       : 'error',
		'no-buffer-constructor' : 'error',
		'no-prototype-builtins' : 'off',		// turning off because this only slightly improves reliability at the expense of readability

		// Stylistic
		'arrow-body-style'         : [ 'error' ],
		'block-spacing'            : [ 'error' ],
		'brace-style'              : [ 'error', 'stroustrup' ],
		'no-nested-ternary'        : [ 'error' ],
		'no-mixed-spaces-and-tabs' : [ 'error', 'smart-tabs' ],
		'object-property-newline'  : [ 'error', { allowMultiplePropertiesPerLine : true } ],
		'func-style'               : [ 'error', 'declaration', { allowArrowFunctions : true } ],
		'max-len'                  : ["warn", { "code": 150 } ],

		// automatically fixable
		'no-unsafe-negation'    : [ 'error' ],
		'dot-location'          : [ 'error', 'property' ],
		'dot-notation'          : [ 'error', { allowPattern : '^[A-Za-z]+(_[A-Za-z0-9]+)+$' } ],
		'no-extra-bind'         : [ 'error' ],
		'no-floating-decimal'   : [ 'error' ],
		'no-implicit-coercion'  : [ 'error', { allow : [ '!!' ] } ],
		'yoda'                  : [ 'error' ],
		'no-undef-init'         : [ 'error' ],
		'array-bracket-spacing' : [ 'error', 'always', { objectsInArrays : true, arraysInArrays : true } ],
		'comma-dangle'          : [ 'error', { objects : 'always-multiline', arrays : 'always-multiline', functions : 'never' } ],
		'comma-spacing'         : [ 'error' ],
		'comma-style'           : [ 'error' ],
		'curly'                 : [ 'error' ],
		'eol-last'              : [ 'error', 'always' ],
		'func-call-spacing'     : [ 'error' ],
		'key-spacing'           : [ 'error', { beforeColon : true, afterColon : true, align : 'colon' } ],
		'keyword-spacing'               : [ 'error' ],
		'linebreak-style'               : [ 'error', 'unix' ],
		'new-parens'                    : [ 'error' ],
		'no-lonely-if'                  : [ 'error' ],
		'no-multiple-empty-lines'       : [ 'error', { max : 2, maxEOF : 1, maxBOF : 0 } ],
		'no-trailing-spaces'            : [ 'error' ],
		'no-whitespace-before-property' : [ 'error' ],
		'object-curly-spacing'          : [ 'error', 'always' ],
		'operator-linebreak'            : [ 'error', 'before' ],
		'quote-props'                   : [ 'error', 'consistent-as-needed' ],
		'quotes'                        : [ 'error', 'single', { avoidEscape : true } ],
		'semi'                          : [ 'error', 'always' ],
		'computed-property-spacing'     : [ 'error', 'never' ],
		'semi-spacing'                  : [ 'error' ],
		'space-before-blocks'           : [ 'error' ],
		'space-before-function-paren'   : [ 'error', { anonymous : 'never', named : 'never', asyncArrow : 'always' } ],
		'space-in-parens'         : [ 'error', 'never' ],
		'space-infix-ops'         : [ 'error' ],
		'space-unary-ops'         : [ 'error', { words : true, nonwords : false } ],
		'spaced-comment'          : [ 'error', 'always', { markers : [ '/' ] } ],
		'arrow-parens'            : [ 'error', 'as-needed' ],
		'arrow-spacing'           : [ 'error' ],
		'generator-star-spacing'  : [ 'error', 'neither' ],
		'no-useless-rename'       : [ 'error' ],
		'no-var'                  : [ 'error' ],
		'prefer-const'            : [ 'error' ],
		'prefer-numeric-literals' : [ 'error' ],
		'prefer-template'         : [ 'error' ],
		'prefer-spread'           : [ 'error' ],
		'template-curly-spacing'  : [ 'error' ],
		'yield-star-spacing'      : [ 'error' ],
		'no-return-await'         : [ 'error' ],
		'no-return-assign'        : [ 'error', 'always' ],
		'object-shorthand'        : [ 'error', 'properties' ],
		'padded-blocks'           : [ "error", { "blocks" : "never", "classes": "always" }],

		// typescript specific rules
		'@typescript-eslint/adjacent-overload-signatures'  : 'error',
		'@typescript-eslint/array-type'                    : 'error',
		'@typescript-eslint/ban-types'                     : 'warn',
		'@typescript-eslint/explicit-function-return-type' : 'off',
		'@typescript-eslint/explicit-member-accessibility' : 'off',
		'@typescript-eslint/explicit-module-boundary-types' : 'off',
		'indent'                                           : 'off',
		'@typescript-eslint/indent'                        : [ 'error', 'tab', {
			SwitchCase : 1,
			ImportDeclaration : 'first',
			ignoredNodes : [
				// ignore properties with decorators
				'FunctionExpression > .params[decorators.length > 0]',
				'FunctionExpression > .params > :matches(Decorator, :not(:first-child))',
				'ClassBody.body > PropertyDefinition[decorators.length > 0] > .key',
			],
		} ],
		'@typescript-eslint/member-delimiter-style'        : 'error',
		'no-array-constructor'                             : 'off',
		'@typescript-eslint/no-array-constructor'          : 'error',
		'@typescript-eslint/no-empty-interface'            : 'error',
		'@typescript-eslint/no-explicit-any'               : 'off',
		// the following rule has a bug with types and decorators: https://github.com/typescript-eslint/typescript-eslint/issues/4608
		// SHOULDDO: check once-in-a-while to see if it's been resolved successfully
		// '@typescript-eslint/no-inferrable-types'           : [ 'error', { ignoreProperties : true } ],
		'@typescript-eslint/no-misused-new'                : 'error',
		'@typescript-eslint/no-namespace'                  : 'error',
		'@typescript-eslint/no-non-null-assertion'         : 'error',
		'@typescript-eslint/consistent-type-assertions'    : 'error',
		'@typescript-eslint/consistent-type-imports'       : [ 'error' ], //{ fixStyle : 'inline-type-imports' } ],
		'@typescript-eslint/no-parameter-properties'       : 'error',
		'no-unused-vars'                                   : 'off',
		'@typescript-eslint/no-unused-vars'                : 'error',
		'no-use-before-define'                             : 'off',
		'@typescript-eslint/no-use-before-define'          : [ 'off', { functions : false } ],		// off because it keeps flagging too many false positives
		'@typescript-eslint/no-var-requires'               : 'error',
		'@typescript-eslint/consistent-type-definitions'   : [ 'error', 'interface' ],
		'@typescript-eslint/prefer-namespace-keyword'      : 'error',
		'@typescript-eslint/type-annotation-spacing'       : 'error',
		'@typescript-eslint/ban-ts-comment'                : [ 'error', { 'ts-ignore' : 'allow-with-description' } ],		// allow @ts-ignore since it's useful sometimes
		'@typescript-eslint/no-floating-promises'          : [ 'error', { ignoreVoid : true, ignoreIIFE: true } ],
		'@typescript-eslint/naming-convention' : [ "error",
			{
				// ignore formatting for properties that require quotes (eg: 'foo.bar')
				selector           : [ 'objectLiteralProperty', 'objectLiteralMethod', 'typeProperty', 'enumMember' ],
				format             : null,
				modifiers          : [ 'requiresQuotes' ]
			}, {
				selector           : 'enumMember',
				format             : [ 'camelCase', 'PascalCase' ],
			}, {
				selector           : 'variable',
				modifiers          : [ 'const' ],
				format             : [ 'camelCase', 'UPPER_CASE', 'PascalCase' ],
				leadingUnderscore  : 'allow',
				trailingUnderscore : 'allow',
			}, {
				selector           : 'function',
				modifiers          : [ 'global', 'exported' ],
				format             : [ 'camelCase', 'PascalCase' ],
			}, {
				selector           : [ 'objectLiteralProperty', 'typeProperty' ],
				format             : [ 'camelCase', 'UPPER_CASE', 'PascalCase' ],
				leadingUnderscore  : 'allow',
			}, {
				selector           : [ 'accessor', 'objectLiteralMethod' ],
				format             : [ 'camelCase', 'PascalCase' ],
				leadingUnderscore  : 'allow',
			}, {
				selector           : 'typeLike',
				format             : [ 'PascalCase' ],
			}, {
				selector           : 'default',
				format             : [ 'camelCase' ],
				leadingUnderscore  : 'allow',
				trailingUnderscore : 'allow',
			},
		],

		// vue specific rules
		'vue/html-indent'                      : [ 'error', 'tab' ],
		'vue/array-bracket-spacing'            : [ 'error', 'always', { objectsInArrays: true, arraysInArrays : true } ],
		'vue/arrow-spacing'                    : [ 'error' ],
		'vue/block-spacing'                    : [ 'error' ],
		'vue/brace-style'                      : [ 'error', 'stroustrup' ],
		'vue/camelcase'                        : [ 'error' ],
		'vue/comma-dangle'                     : [ 'error', { objects : 'always-multiline', arrays: 'always-multiline', functions: 'never' } ],
		'vue/component-definition-name-casing' : [ 'error', 'kebab-case' ],
		'vue/dot-location'                     : [ 'error', 'property' ],
		'vue/key-spacing'                      : [ 'error', {
			beforeColon : true,
			afterColon  : true,
			align       : 'colon',
		} ],
		'vue/keyword-spacing'         : [ 'error' ],
		'vue/no-irregular-whitespace' : [ 'error' ],
		'vue/object-curly-spacing'    : [ 'error', 'always' ],
		'vue/space-infix-ops'         : [ 'error' ],
		'vue/space-unary-ops'         : [ 'error', { words : true, nonwords : false } ],
		'vue/max-attributes-per-line' : [ 'error', { singleline : 3 } ],
		'vue/no-v-text-v-html-on-component' : 'off',		// we want to allow v-text but not v-html
		'vue/no-v-html'               : 'warn',

		// custom rules
		'local-rules/align-assign'  : [ 'error', { maxSpaces : 25 } ],
		'local-rules/align-imports' : [ 'error', { maxSpaces : 30, collapseExtraSpaces : true } ],
	},
};
