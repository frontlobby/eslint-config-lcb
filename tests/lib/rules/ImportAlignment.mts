import type { RuleTester } from 'eslint';
import { RuleTester as RuleTesterRunner } from 'eslint';

import { ImportAlignment } from '../../../lib/rules/ImportAlignment.mts';
import { namedCase as namedCaseHelper, trimCodeWhitespace } from '../../../lib/utils.mts';

const languageOptions = { sourceType : 'module', ecmaVersion : 2015 as const };

const ruleTester = new RuleTesterRunner();

ruleTester.run('align-imports', ImportAlignment.toEslintRule(), trimCodeWhitespace({

	valid : [
		namedCase('accepts already aligned adjacent default imports', `
			import foo from 'foo';
			import bar from 'bar';
		`),

		namedCase('accepts alignment to the longest adjacent import',`
			import foo                                from 'foo';
			import supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';
		`),

		namedCase('ignores multiline imports when neighboring single-line imports are aligned',`
			import foo                                from 'foo';
			import supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';
			import {
				A,
				B
			} from 'foo';
		`),

		namedCase('respects minColumnWidth for shorter imports', `
			import foo          from 'foo';
			import bar          from 'bar';
		`, { options : [ { minColumnWidth : 20 } ] }),

		namedCase('keeps valid alignment when a longer import exceeds minColumnWidth', `
			import supercalifragilisticexpialidocious from 'foo';
			import bar                                from 'bar';
		`, { options : [ { minColumnWidth : 20 } ] }),

		namedCase('allows extra spacing when collapseExtraSpaces is disabled', `
			import foo    from 'foo';
			import bar    from 'bar';
		`, { options : [ { collapseExtraSpaces : false } ] }),

		namedCase('accepts a long named import when maxLen is not set', `
			import { alpha, beta, gamma, delta, epsilon, zeta, eta, theta } from 'some/module';
		`),
	],

	invalid : [
		namedCase('aligns a short import to the longest adjacent import', {
			code   : `
				import foo from 'foo';
				import supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';
			`,
			output : `
				import foo                                from 'foo';
				import supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';
			`,
			errors : [ { message : 'Unaligned import statement' } ],
		}),

		namedCase('treats blank lines as separate alignment groups', {
			code   : `
				import foo             from 'foo';

				import bar                                from 'bar';
				import supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';
			`,
			output :`
				import foo from 'foo';

				import bar                                from 'bar';
				import supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';
			`,
			errors : [ { message : 'Unaligned import statement' } ],
		}),

		namedCase('collapses extra spaces for equally sized default imports', {
			code   : `
				import foo   from 'foo';
				import bar   from 'bar';
			`,
			output : `
				import foo from 'foo';
				import bar from 'bar';
			`,
			errors : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		}),

		namedCase('collapses mismatched extra spaces across default imports', {
			code    : `
				import foo    from 'foo';
				import bar   from 'bar';
			`,
			output  : `
				import foo from 'foo';
				import bar from 'bar';
			`,
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		}),

		namedCase('collapses extra spaces on a single over-padded import', {
			code    : `
				import foo    from 'foo';
				import bar from 'bar';
			`,
			output  : `
				import foo from 'foo';
				import bar from 'bar';
			`,
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' } ],
		}),

		namedCase('collapses extra spaces between named and default imports', {
			code    : `
				import { foo }    from 'foo';
				import bar       from 'bar';
			`,
			output  : `
				import { foo } from 'foo';
				import bar     from 'bar';
			`,
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		}),

		namedCase('collapses extra spaces while preserving the wider named import', {
			code    : `
				import { foo, test }    from 'foo';
				import bar     from 'bar';
			`,
			output  : `
				import { foo, test } from 'foo';
				import bar           from 'bar';
			`,
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' } ],
		}),

		namedCase('expands import alignment to the minimum column width', {
			code    : `
				import foo       from 'foo';
				import bar       from 'bar';
			`,
			output  : `
				import foo          from 'foo';
				import bar          from 'bar';
			`,
			options : [ { minColumnWidth : 20 } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		}),

		namedCase('reduces overpadded imports while honoring minColumnWidth', {
			code    : `
				import foo              from 'foo';
				import bar              from 'bar';
			`,
			output  : `
				import foo          from 'foo';
				import bar          from 'bar';
			`,
			options : [ { minColumnWidth : 20, collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		}),

		namedCase('scenario 1', {
			code    : `
				import { Country, CountryLabels, CountryRegions, getRegionLabel } from '$/lib/Address';
				import { copyToClipboard, formSelectOptions, waitFor } from '$/lib/utils';
				import { Component, InjectReactive, Prop, Ref, Vue, Watch } from '$/lib/vueExt';
				import Markdown from '$/lib/widgets/Markdown.vue';
				import Toast    from '$/lib/widgets/Toast.vue';
			`,
			output  : `
				import { Country, CountryLabels, CountryRegions, getRegionLabel } from '$/lib/Address';
				import { copyToClipboard, formSelectOptions, waitFor }            from '$/lib/utils';
				import { Component, InjectReactive, Prop, Ref, Vue, Watch }       from '$/lib/vueExt';
				import Markdown from '$/lib/widgets/Markdown.vue';
				import Toast    from '$/lib/widgets/Toast.vue';
			`,
			options : [ { maxSpaces : 30, collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		}),

		namedCase('scenario 2', {
			code    : `
				import random from '$/lib/Random';
				import { Component, Prop, Ref, Vue, Watch } from '$/lib/vueExt';
				import Form         from '$/lib/widgets/form/Form.vue';
				import FormCurrency from '$/lib/widgets/form/FormCurrency.vue';
				import Step         from '$/lib/widgets/Steps/Step.vue';
				import Toast        from '$/lib/widgets/Toast.vue';
			`,
			output  : `
				import random       from '$/lib/Random';
				import { Component, Prop, Ref, Vue, Watch } from '$/lib/vueExt';
				import Form         from '$/lib/widgets/form/Form.vue';
				import FormCurrency from '$/lib/widgets/form/FormCurrency.vue';
				import Step         from '$/lib/widgets/Steps/Step.vue';
				import Toast        from '$/lib/widgets/Toast.vue';
			`,
			options : [ { maxSpaces : 30, collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' } ],
		}),

		namedCase('scenario 3', {
			code    : `
				import Axios                                   from 'axios';

				import { Answers, Questionnaire, Result } from '$/lib/equifax/KountClient';
				import { Entity }                         from '$/lib/typeormExt';
			`,
			output    : `
				import Axios from 'axios';

				import { Answers, Questionnaire, Result } from '$/lib/equifax/KountClient';
				import { Entity }                         from '$/lib/typeormExt';
			`,
			options : [ { maxSpaces : 30, collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' } ],
		})
	],
}));

ruleTester.run('align-imports maxLen', ImportAlignment.toEslintRule(), {

	valid : [
		namedCase('accepts a correctly wrapped import that cannot fit on one line', {
			code    : 'import {\n\talpha, beta, gamma, delta, epsilon, zeta, eta, theta\n} from \'some/module\';',
			options : [ { maxLen : 60 } ],
		}),

		namedCase('accepts a canonical multiline import that exceeds maxLen when collapsed', {
			code    : 'import {\n\tveryLongNameOne, veryLongNameTwo, veryLongNameThree, x\n} from \'module\';',
			options : [ { maxLen : 55 } ],
		}),

		namedCase('keeps a multiline import when collapsed length is within maxLen but inside the unwrap buffer', {
			code    : 'import {\n\talpha, beta, gamma\n} from \'mod\';',
			options : [ { maxLen : 40, maxLenBuffer : 5 } ],
		}),

		namedCase('accepts a canonical multiline import after reflow when lines sit within the wrap buffer', {
			code    : 'import {\n\tdateFromMonthDay, daysAgoToDate, Debounce, doWithRetries, getDateRange, getEmailWithoutSubAddress, getFunctionParams, getPropertyDescriptor,\n\tpromiseTimeout, stringify, throttlePerSecond, TimeoutError, waitFor\n} from \'$/lib/utils\';',
			options : [ { maxLen : 140, maxLenBuffer : 10 } ],
		}),

		namedCase('keeps a single-line import when line length is within the wrap buffer', {
			code    : 'import { aaaaaaaaaaaaaaaaaaaaa } from \'x\';',
			options : [ { maxLen : 40, maxLenBuffer : 5 } ],
		}),
	],

	invalid : [
		namedCase('wraps a single-line named import that exceeds maxLen', {
			code    : 'import { alpha, beta, gamma, delta, epsilon, zeta, eta, theta } from \'some/module\';',
			output  : 'import {\n\talpha, beta, gamma, delta, epsilon, zeta, eta, theta\n} from \'some/module\';',
			options : [ { maxLen : 60 } ],
			errors  : [ { message : 'Import statement exceeds maximum line length' } ],
		}),

		namedCase('wraps a single-line import when line length exceeds the wrap buffer', {
			code    : 'import { aaaaaaaaaaaaaaaaaaaaaaaaa } from \'x\';',
			output  : 'import {\n\taaaaaaaaaaaaaaaaaaaaaaaaa\n} from \'x\';',
			options : [ { maxLen : 40, maxLenBuffer : 5 } ],
			errors  : [ { message : 'Import statement exceeds maximum line length' } ],
		}),

		namedCase('wraps a mixed import while preserving the default prefix', {
			code    : 'import Foo, { alpha, beta, gamma, delta, epsilon, zeta, eta } from \'some/module\';',
			output  : 'import Foo, {\n\talpha, beta, gamma, delta, epsilon, zeta, eta\n} from \'some/module\';',
			options : [ { maxLen : 55 } ],
			errors  : [ { message : 'Import statement exceeds maximum line length' } ],
		}),

		namedCase('unwraps a multiline import that fits on one line', {
			code    : 'import {\n\tA,\n\tB\n} from \'foo\';',
			output  : 'import { A, B } from \'foo\';',
			options : [ { maxLen : 80 } ],
			errors  : [ { message : 'Import statement should be on a single line when it fits within the line limit' } ],
		}),

		namedCase('unwraps a mixed multiline import that fits on one line', {
			code    : 'import Foo, {\n\tA,\n\tB\n} from \'foo\';',
			output  : 'import Foo, { A, B } from \'foo\';',
			options : [ { maxLen : 80 } ],
			errors  : [ { message : 'Import statement should be on a single line when it fits within the line limit' } ],
		}),

		namedCase('reflows a multiline import with an overlong line', {
			code    : 'import {\n\tveryLongNameOne, veryLongNameTwo, veryLongNameThree,\n\tx\n} from \'module\';',
			output  : 'import {\n\tveryLongNameOne, veryLongNameTwo,\n\tveryLongNameThree, x\n} from \'module\';',
			options : [ { maxLen : 50, maxLenBuffer : 0 } ],
			errors  : [ { message : 'Import statement exceeds maximum line length' } ],
		}),

		namedCase('reflows one-specifier-per-line layout into canonical packing', {
			code    : 'import {\n\talpha,\n\tbeta,\n\tgamma\n} from \'mod\';',
			output  : 'import {\n\talpha, beta, gamma\n} from \'mod\';',
			options : [ { maxLen : 30 } ],
			errors  : [ { message : 'Import statement exceeds maximum line length' } ],
		}),

		namedCase('reflows multiline import with missing specifier indent', {
			code    : 'import {\nalpha, beta, gamma\n} from \'mod\';',
			output  : 'import {\n\talpha, beta, gamma\n} from \'mod\';',
			options : [ { maxLen : 30 } ],
			errors  : [ { message : 'Import statement exceeds maximum line length' } ],
		}),

		namedCase('adds a missing semicolon to a canonical multiline import', {
			code    : 'import {\n\talpha, beta, gamma\n} from \'mod\'',
			output  : 'import {\n\talpha, beta, gamma\n} from \'mod\';',
			options : [ { maxLen : 30 } ],
			errors  : [ { message : 'Import statement exceeds maximum line length' } ],
		}),

		namedCase('unwraps a multiline import when collapsed length is below the unwrap buffer', {
			code    : 'import {\n\tA,\n\tB\n} from \'foo\';',
			output  : 'import { A, B } from \'foo\';',
			options : [ { maxLen : 40, maxLenBuffer : 5 } ],
			errors  : [ { message : 'Import statement should be on a single line when it fits within the line limit' } ],
		}),
	],
});

function namedCase( name: string, testCase: string, options?: Omit<RuleTester.ValidTestCase, 'name' | 'code'>, ): RuleTester.ValidTestCase & { name: string };
function namedCase( name: string, testCase: RuleTester.InvalidTestCase, options?: Omit<RuleTester.ValidTestCase, 'name' | 'code'>, ): RuleTester.InvalidTestCase & { name: string };
function namedCase( name: string, testCase: RuleTester.ValidTestCase, options?: Omit<RuleTester.ValidTestCase, 'name' | 'code'>, ): RuleTester.ValidTestCase & { name: string };
function namedCase(
	name: string,
	testCase: string | RuleTester.ValidTestCase | RuleTester.InvalidTestCase,
	options: Omit<RuleTester.ValidTestCase, 'name' | 'code'> = {},
) {
	if (typeof testCase === 'string') {
		return namedCaseHelper(name, testCase, { languageOptions, ...options });
	}

	if ('errors' in testCase) {
		return namedCaseHelper(name, testCase, { languageOptions, ...options });
	}

	return namedCaseHelper(name, testCase, { languageOptions, ...options });
}
