/**
 * @fileoverview Require vue-facing-decorator props to declare prop requirements and readonly fields
 */
import type { RuleTester as RuleTesterTypes } from 'eslint';
import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';

import { VueFacingDecoratorPropRequirements } from '../../../lib/rules/VueFacingDecoratorPropRequirements.mts';
import { namedCase, trimCodeWhitespace } from '../../../lib/utils.mts';

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

ruleTester.run('vue-facing-decorator-prop-requirements', VueFacingDecoratorPropRequirements.toEslintRule(), trimCodeWhitespace({
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

function vueCase(
	name: string,
	testCase: string,
	options?: Omit<RuleTesterTypes.ValidTestCase, 'name' | 'code'>,
): RuleTesterTypes.ValidTestCase & { name: string };

function vueCase(
	name: string,
	testCase: RuleTesterTypes.InvalidTestCase,
	options?: Omit<RuleTesterTypes.ValidTestCase, 'name' | 'code'>,
): RuleTesterTypes.InvalidTestCase & { name: string };

function vueCase(
	name: string,
	testCase: RuleTesterTypes.ValidTestCase,
	options?: Omit<RuleTesterTypes.ValidTestCase, 'name' | 'code'>,
): RuleTesterTypes.ValidTestCase & { name: string };

function vueCase(
	name: string,
	testCase: string | RuleTesterTypes.ValidTestCase | RuleTesterTypes.InvalidTestCase,
	options: Omit<RuleTesterTypes.ValidTestCase, 'name' | 'code'> = {},
) {
	if (typeof testCase === 'string') {
		return namedCase(name, testCase, { filename : 'test.ts', ...options });
	}

	if ('errors' in testCase) {
		return namedCase(name, testCase, { filename : 'test.ts', ...options });
	}

	return namedCase(name, testCase, { filename : 'test.ts', ...options });
}
