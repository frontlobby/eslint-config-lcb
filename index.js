module.exports = {
	extends : 'eslint:recommended',

	parserOptions : { ecmaVersion : 6 },

	env : { es6 : true },

	globals : {
		setImmediate : true,
		require      : true,
	},

	/*plugins : [
		'@lcbapp/eslint-custom',
	],*/

	rules : {
		// Possible Errors
		'no-cond-assign'           : 'error',
		'no-constant-condition'    : 'error',
		'no-debugger'              : 'warn',	// should be "error" in production builds
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
		'no-else-return'        : 'warn',
		'no-loop-func'          : 'error',
		'no-implied-eval'       : 'warn',
		'no-buffer-constructor' : 'error',

		// Variables
		'no-unused-vars' : 'error',

		// Stylistic
		'arrow-body-style'         : [ 'warn' ],
		'block-spacing'            : [ 'warn' ],
		'brace-style'              : [ 'warn', 'stroustrup' ],
		'camelcase'                : [ 'warn', { properties : 'always' } ],
		'no-array-constructor'     : [ 'warn' ],
		'no-nested-ternary'        : [ 'warn' ],
		'no-mixed-spaces-and-tabs' : [ 'warn', 'smart-tabs' ],
		'object-property-newline'  : [ 'warn', { allowMultiplePropertiesPerLine : true } ],
		'func-style'               : [ 'warn', 'declaration', { allowArrowFunctions : true } ],

		// automatically fixable
		'no-unsafe-negation'    : [ 'warn' ],
		'dot-location'          : [ 'warn', 'property' ],
		'dot-notation'          : [ 'warn', { allowPattern : '^[A-Za-z]+(_[A-Za-z0-9]+)+$' } ],
		'no-extra-bind'         : [ 'warn' ],
		'no-floating-decimal'   : [ 'warn' ],
		'no-implicit-coercion'  : [ 'warn', { allow : [ '!!' ] } ],
		'yoda'                  : [ 'warn' ],
		'no-undef-init'         : [ 'warn' ],
		'array-bracket-spacing' : [ 'warn', 'always', { objectsInArrays : true, arraysInArrays : true } ],
		'comma-dangle'          : [ 'warn', { objects : 'always-multiline', arrays : 'always-multiline', functions : 'never' } ],
		'comma-spacing'         : [ 'warn' ],
		'comma-style'           : [ 'warn' ],
		'curly'                 : [ 'warn' ],
		'eol-last'              : [ 'error', 'always' ],
		'func-call-spacing'     : [ 'warn' ],
		'indent'                : [ 'warn', 'tab', { SwitchCase : 1 } ],
		'key-spacing'           : [ 'warn', {
			beforeColon : true,
			afterColon  : true,
			align       : 'colon',
		} ],
		'keyword-spacing'               : [ 'warn' ],
		'linebreak-style'               : [ 'warn', 'unix' ],
		'new-parens'                    : [ 'warn' ],
		'no-lonely-if'                  : [ 'warn' ],
		'no-multiple-empty-lines'       : [ 'warn', { max : 2, maxEOF : 1, maxBOF : 0 } ],
		'no-trailing-spaces'            : [ 'warn' ],
		'no-whitespace-before-property' : [ 'warn' ],
		'object-curly-spacing'          : [ 'warn', 'always' ],
		'operator-linebreak'            : [ 'warn', 'before' ],
		'quote-props'                   : [ 'warn', 'consistent-as-needed' ],
		'quotes'                        : [ 'warn', 'single', { avoidEscape : true } ],
		'semi'                          : [ 'warn', 'always' ],
		'computed-property-spacing'     : [ 'warn', 'never' ],
		'semi-spacing'                  : [ 'warn' ],
		'space-before-blocks'           : [ 'warn' ],
		'space-before-function-paren'   : [ 'warn', {
			anonymous  : 'never',
			named      : 'never',
			asyncArrow : 'always',
		} ],
		'space-in-parens'         : [ 'warn', 'never' ],
		'space-infix-ops'         : [ 'warn' ],
		'space-unary-ops'         : [ 'warn', { words : true, nonwords : false } ],
		'spaced-comment'          : [ 'warn', 'always' ],
		'arrow-parens'            : [ 'warn', 'as-needed' ],
		'arrow-spacing'           : [ 'warn' ],
		'generator-star-spacing'  : [ 'warn', 'neither' ],
		'no-useless-rename'       : [ 'warn' ],
		'no-var'                  : [ 'warn' ],
		'prefer-const'            : [ 'warn' ],
		'prefer-numeric-literals' : [ 'warn' ],
		'prefer-template'         : [ 'warn' ],
		'prefer-spread'           : [ 'warn' ],
		'template-curly-spacing'  : [ 'warn' ],
		'yield-star-spacing'      : [ 'warn' ],
		'no-return-await'         : [ 'warn' ],
		'no-return-assign'        : [ 'error', 'always' ],
		'object-shorthand'        : [ 'warn', 'properties' ],
	},
};
