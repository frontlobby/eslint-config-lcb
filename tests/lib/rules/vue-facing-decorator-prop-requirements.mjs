/**
 * @fileoverview Require vue-facing-decorator props to declare prop requirements and readonly fields
 */
import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';

import rule from '../../../lib/rules/vue-facing-decorator-prop-requirements.mjs';
import { namedCase } from '../../../lib/utils.mjs';

const ruleTester = new RuleTester({
	languageOptions : {
		ecmaVersion : 2022,
		sourceType  : 'module',
		parser      : tsParser,
		parserOptions : {
			filePath : 'test.ts',
		},
	},
});

ruleTester.run('vue-facing-decorator-prop-requirements', rule, trimCodeWhitespace({
	valid : [
		vueCase('accepts required readonly props in @Component classes', `
			import { Component, Prop } from 'vue-facing-decorator';

			@Component
			class Example {
				@Prop({ required : true })
				readonly requiredField: string;
			}
		`),

		vueCase('accepts default readonly props in @Component() classes', `
			import { Component, Prop } from 'vue-facing-decorator';

			@Component({})
			class Example {
				@Prop({ default : 123 })
				readonly optionalField: number;
			}
		`),

		vueCase('ignores @Prop fields outside @Component classes', `
			import { Prop } from 'vue-facing-decorator';

			class Example {
				@Prop()
				value: string;
			}
		`),

		vueCase('ignores decorators from other packages', `
			import { Component, Prop } from 'another-decorator-package';

			@Component
			class Example {
				@Prop()
				value: string;
			}
		`),

		vueCase('ignores aliased imports from vue-facing-decorator', `
			import { Component as DecoratedComponent, Prop as DecoratedProp } from 'vue-facing-decorator';

			@DecoratedComponent
			class Example {
				@DecoratedProp()
				value: string;
			}
		`),
	],

	invalid : [
		vueCase('requires either default or required true', {
			code : `
				import { Component, Prop } from 'vue-facing-decorator';

				@Component
				class Example {
					@Prop({})
					readonly value: string;
				}
			`,
			errors : [ { messageId : 'missingPropOptions' } ],
		}),

		vueCase('rejects props that declare both default and required true', {
			code : `
				import { Component, Prop } from 'vue-facing-decorator';

				@Component
				class Example {
					@Prop({ default : 123, required : true })
					readonly value: number;
				}
			`,
			errors : [ { messageId : 'conflictingPropOptions' } ],
		}),

		vueCase('rejects required false without a default', {
			code : `
				import { Component, Prop } from 'vue-facing-decorator';

				@Component
				class Example {
					@Prop({ required : false })
					readonly value: string;
				}
			`,
			errors : [ { messageId : 'missingPropOptions' } ],
		}),

		vueCase('rejects dynamic prop config identifiers', {
			code : `
				import { Component, Prop } from 'vue-facing-decorator';

				const config = { required : true };

				@Component
				class Example {
					@Prop(config)
					readonly value: string;
				}
			`,
			errors : [ { messageId : 'unsupportedPropOptions' } ],
		}),

		vueCase('rejects spread-based prop config objects', {
			code : `
				import { Component, Prop } from 'vue-facing-decorator';

				const config = { required : true };

				@Component
				class Example {
					@Prop({ ...config })
					readonly value: string;
				}
			`,
			errors : [ { messageId : 'unsupportedPropOptions' } ],
		}),

		vueCase('rejects bare @Prop decorators without autofixing them', {
			code : `
				import { Component, Prop } from 'vue-facing-decorator';

				@Component
				class Example {
					@Prop
					readonly value: string;
				}
			`,
			errors : [ { messageId : 'missingPropOptions' } ],
		}),

		vueCase('autofixes empty @Prop() calls to required true', {
			code : `
				import { Component, Prop } from 'vue-facing-decorator';

				@Component
				class Example {
					@Prop()
					readonly value: string;
				}
			`,
			output : `
				import { Component, Prop } from 'vue-facing-decorator';

				@Component
				class Example {
					@Prop({ required : true })
					readonly value: string;
				}
			`,
			errors : [ { messageId : 'emptyPropArguments' } ],
		}),

		vueCase('autofixes missing readonly on prop fields', {
			code : `
				import { Component, Prop } from 'vue-facing-decorator';

				@Component
				class Example {
					@Prop({ required : true })
					value: string;
				}
			`,
			output : `
				import { Component, Prop } from 'vue-facing-decorator';

				@Component
				class Example {
					@Prop({ required : true })
					readonly value: string;
				}
			`,
			errors : [ { messageId : 'missingReadonly' } ],
		}),

		vueCase('applies both the empty @Prop() fix and the readonly fix', {
			code : `
				import { Component, Prop } from 'vue-facing-decorator';

				@Component
				class Example {
					@Prop()
					value: string;
				}
			`,
			output : `
				import { Component, Prop } from 'vue-facing-decorator';

				@Component
				class Example {
					@Prop({ required : true })
					readonly value: string;
				}
			`,
			errors : [ { messageId : 'emptyPropArguments' }, { messageId : 'missingReadonly' } ],
		}),
	],
}));

function trimCodeWhitespace(testCases) {
	if (Array.isArray(testCases)) {
		return testCases.map(trimCodeWhitespace);
	}

	if (typeof testCases === 'object' && testCases !== null) {
		return Object.fromEntries(Object.entries(testCases).map(([ key, value ]) => {
			if ((key === 'code' || key === 'output') && typeof value === 'string') {
				return [ key, value.split('\n').map(line => line.replace(/^\s+/, '')).join('\n').trim() ];
			}
			return [ key, trimCodeWhitespace(value) ];
		}));
	}

	return testCases;
}

function vueCase(name, testCase, options) {
	return namedCase(name, testCase, { filename : 'test.ts', ...options });
}
