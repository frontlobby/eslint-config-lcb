/**
 * @fileoverview Require from keywords to be aligned
 * @author Maël Nison
 * @copyright 2016 Maël Nison. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict';

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const rule = require('../../../lib/rules/import-align'),

	RuleTester = require('eslint').RuleTester;

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

const parserOptions = { sourceType : 'module', ecmaVersion : 2015 };

const ruleTester = new RuleTester();

ruleTester.run('import-align', rule, {

	valid : [

		{
			code : "import foo from 'foo';\nimport bar from 'bar';\n",
			parserOptions,
		},
		{
			code : "import foo                                from 'foo';\nimport supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';\n",
			parserOptions,
		},
		{
			code : "import foo                                from 'foo';\nimport supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';\nimport {\n    A,\n    B\n} from 'foo';\n",
			parserOptions,
		},
		{
			code    : "import foo          from 'foo';\nimport bar          from 'bar';\n",
			parserOptions,
			options : [ { minColumnWidth : 20 } ],
		},
		{
			code    : "import supercalifragilisticexpialidocious from 'foo';\nimport bar                                from 'bar';\n",
			parserOptions,
			options : [ { minColumnWidth : 20 } ],
		},
		{
			code    : "import foo    from 'foo';\nimport bar    from 'bar';\n",
			parserOptions,
			options : [ { collapseExtraSpaces : false } ],
		},

	],

	invalid : [

		{
			code   : "import foo from 'foo';\nimport supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';",
			parserOptions,
			output : "import foo                                from 'foo';\nimport supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';",
			errors : [ { message : 'Unaligned import statement' } ],
		},
		{
			code   : "import foo from 'foo';\n\nimport bar                                from 'bar';\nimport supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';",
			parserOptions,
			output : "import foo                                from 'foo';\n\nimport bar                                from 'bar';\nimport supercalifragilisticexpialidocious from 'supercalifragilisticexpialidocious';",
			errors : [ { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import foo   from 'foo';\nimport bar   from 'bar';\n",
			parserOptions,
			output  : "import foo from 'foo';\nimport bar from 'bar';\n",
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import foo    from 'foo';\nimport bar   from 'bar';\n",
			parserOptions,
			output  : "import foo from 'foo';\nimport bar from 'bar';\n",
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import foo    from 'foo';\nimport bar from 'bar';\n",
			parserOptions,
			output  : "import foo from 'foo';\nimport bar from 'bar';\n",
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import { foo }    from 'foo';\nimport bar       from 'bar';\n",
			parserOptions,
			output  : "import { foo } from 'foo';\nimport bar     from 'bar';\n",
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import { foo }    from 'foo';\nimport bar     from 'bar';\n",
			parserOptions,
			output  : "import { foo } from 'foo';\nimport bar     from 'bar';\n",
			options : [ { collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import foo       from 'foo';\nimport bar       from 'bar';\n",
			output  : "import foo          from 'foo';\nimport bar          from 'bar';\n",
			parserOptions,
			options : [ { minColumnWidth : 20 } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		},
		{
			code    : "import foo              from 'foo';\nimport bar              from 'bar';\n",
			output  : "import foo          from 'foo';\nimport bar          from 'bar';\n",
			parserOptions,
			options : [ { minColumnWidth : 20, collapseExtraSpaces : true } ],
			errors  : [ { message : 'Unaligned import statement' }, { message : 'Unaligned import statement' } ],
		},

	],

});
