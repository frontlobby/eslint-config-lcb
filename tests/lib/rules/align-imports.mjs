/**
 * @fileoverview Require from keywords to be aligned
 * @author Maël Nison
 * @copyright 2016 Maël Nison. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
import eslint from 'eslint';

import rule from '../../../lib/rules/align-imports.mjs';

const { RuleTester } = eslint;

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

const languageOptions = { sourceType : 'module', ecmaVersion : 2015 };

const ruleTester = new RuleTester();

ruleTester.run('align-imports', rule, {

	valid : [

		{
			code : "import foo from 'foo';\nimport bar from 'bar';\n",
			languageOptions,
		},
		{
			code : "import foo                                from 'foo';\nimport supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';\n",
			languageOptions,
		},
		{
			code : "import foo                                from 'foo';\nimport supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';\nimport {\n    A,\n    B\n} from 'foo';\n",
			languageOptions,
		},
		{
			code    : "import foo          from 'foo';\nimport bar          from 'bar';\n",
			languageOptions,
			options : [ { minColumnWidth : 20 } ],
		},
		{
			code    : "import supercalifragilisticexpialidocious from 'foo';\nimport bar                                from 'bar';\n",
			languageOptions,
			options : [ { minColumnWidth : 20 } ],
		},
		{
			code    : "import foo    from 'foo';\nimport bar    from 'bar';\n",
			languageOptions,
			options : [ { collapseExtraSpaces : false } ],
		},

	],

	invalid : [

		{
			code   : "import foo from 'foo';\nimport supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';",
			languageOptions,
			output : "import foo                                from 'foo';\nimport supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';",
			errors : [ { message : 'Unaligned import statement' } ],
		},
		{
			code   : "import foo from 'foo';\n\nimport bar                                from 'bar';\nimport supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';",
			languageOptions,
			output : "import foo                                from 'foo';\n\nimport bar                                from 'bar';\nimport supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';",
			errors : [ { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import foo   from 'foo';\nimport bar   from 'bar';\n",
			languageOptions,
			output  : "import foo from 'foo';\nimport bar from 'bar';\n",
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import foo    from 'foo';\nimport bar   from 'bar';\n",
			languageOptions,
			output  : "import foo from 'foo';\nimport bar from 'bar';\n",
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import foo    from 'foo';\nimport bar from 'bar';\n",
			languageOptions,
			output  : "import foo from 'foo';\nimport bar from 'bar';\n",
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import { foo }    from 'foo';\nimport bar       from 'bar';\n",
			languageOptions,
			output  : "import { foo } from 'foo';\nimport bar     from 'bar';\n",
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import { foo }    from 'foo';\nimport bar     from 'bar';\n",
			languageOptions,
			output  : "import { foo } from 'foo';\nimport bar     from 'bar';\n",
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import foo       from 'foo';\nimport bar       from 'bar';\n",
			output  : "import foo          from 'foo';\nimport bar          from 'bar';\n",
			languageOptions,
			options : [ { minColumnWidth : 20 } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import foo              from 'foo';\nimport bar              from 'bar';\n",
			output  : "import foo          from 'foo';\nimport bar          from 'bar';\n",
			languageOptions,
			options : [ { minColumnWidth : 20, collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		},

	],

});
