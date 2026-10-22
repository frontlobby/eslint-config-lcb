/**
 * Registry of custom local ESLint rules for the LCB config.
 *
 * Maps rule names (used as local-rules/<name> in baseRules.mjs) to RuleModule instances
 * built from the typed rule classes in lib/rules/.
 */
import type { Rule } from 'eslint';

import { AssignAlignment }                    from './lib/rules/AssignAlignment.mts';
import { ClassFieldsAlignment }               from './lib/rules/ClassFieldsAlignment.mts';
import { ClassMethodsNewline }                from './lib/rules/ClassMethodsNewline.mts';
import { EnumValueAlignment }                 from './lib/rules/EnumValueAlignment.mts';
import { ImportAlignment }                    from './lib/rules/ImportAlignment.mts';
import { InterfaceLayout }                    from './lib/rules/InterfaceLayout.mts';
import { MultilineStatementPadding }          from './lib/rules/MultilineStatementPadding.mts';
import { MultilineTernary }                   from './lib/rules/MultilineTernary.mts';
import { PreferSmallTernary }                 from './lib/rules/PreferSmallTernary.mts';
import { PreferUnescapedQuotes }              from './lib/rules/PreferUnescapedQuotes.mts';
import { SingleLineJsonObject }               from './lib/rules/SingleLineJsonObject.mts';
import { TypeAnnotationSpacing }              from './lib/rules/TypeAnnotationSpacing.mts';
import { VueFacingDecoratorPropRequirements } from './lib/rules/VueFacingDecoratorPropRequirements.mts';

export const localRules: Record<string, Rule.RuleModule> = {
	'align-assign'                           : AssignAlignment.toEslintRule(),
	'align-class-fields'                     : ClassFieldsAlignment.toEslintRule(),
	'align-enum-values'                      : EnumValueAlignment.toEslintRule(),
	'align-imports'                          : ImportAlignment.toEslintRule(),
	'class-methods-newline'                  : ClassMethodsNewline.toEslintRule(),
	'interface-layout'                       : InterfaceLayout.toEslintRule(),
	'multiline-statement-padding'            : MultilineStatementPadding.toEslintRule(),
	'multiline-ternary'                      : MultilineTernary.toEslintRule(),
	'prefer-small-ternary'                   : PreferSmallTernary.toEslintRule(),
	'prefer-unescaped-quotes'                : PreferUnescapedQuotes.toEslintRule(),
	'single-line-json-object'                : SingleLineJsonObject.toEslintRule(),
	'type-annotation-spacing'                : TypeAnnotationSpacing.toEslintRule(),
	'vue-facing-decorator-prop-requirements' : VueFacingDecoratorPropRequirements.toEslintRule(),
};
