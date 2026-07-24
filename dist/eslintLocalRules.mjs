import { AssignAlignment } from "./lib/rules/AssignAlignment.mjs";
import { EnumValueAlignment } from "./lib/rules/EnumValueAlignment.mjs";
import { ImportAlignment } from "./lib/rules/ImportAlignment.mjs";
import { MultilineTernary } from "./lib/rules/MultilineTernary.mjs";
import { PreferSmallTernary } from "./lib/rules/PreferSmallTernary.mjs";
import { SingleLineJsonObject } from "./lib/rules/SingleLineJsonObject.mjs";
import { VueFacingDecoratorPropRequirements } from "./lib/rules/VueFacingDecoratorPropRequirements.mjs";
export const localRules = {
    'align-assign': AssignAlignment.toEslintRule(),
    'align-enum-values': EnumValueAlignment.toEslintRule(),
    'align-imports': ImportAlignment.toEslintRule(),
    'multiline-ternary': MultilineTernary.toEslintRule(),
    'prefer-small-ternary': PreferSmallTernary.toEslintRule(),
    'single-line-json-object': SingleLineJsonObject.toEslintRule(),
    'vue-facing-decorator-prop-requirements': VueFacingDecoratorPropRequirements.toEslintRule(),
};
