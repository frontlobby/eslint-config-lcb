import { RuleTester } from 'eslint';

import rule from '../../../lib/rules/align-imports.mjs';
import { namedCase as namedCaseHelper } from '../../../lib/utils.mjs';

const languageOptions = { sourceType : 'module', ecmaVersion : 2015 };

const ruleTester = new RuleTester();

function namedCase(name, testCase, options) {
	return namedCaseHelper(name, testCase, { languageOptions, ...options });
}

ruleTester.run('align-imports', rule, trimCodeWhitespace({

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

// look through the objects to find a code property
// and trim the whitespace from the beginning and end of the code and and whitespace at the start of lines
function trimCodeWhitespace(testCases) {
	// Recursively process arrays or objects and return transformed input
	if (Array.isArray(testCases)) {
		return testCases.map(trimCodeWhitespace);
	}
	if (typeof testCases === 'object' && testCases !== null) {
		return Object.fromEntries(Object.entries(testCases).map(([ key, value ]) => {
			if ((key === 'code' || key === 'output') && typeof value === 'string') {
				return [ key, value
					.split('\n')
					.map(line => line.replace(/^\s+/, ''))
					.join('\n')
					.trim() ];
			}
			return [ key, trimCodeWhitespace(value) ];
		}));
	}
	return testCases;
}
