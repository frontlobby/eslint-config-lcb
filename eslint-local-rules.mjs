import alignAssign from './lib/rules/align-assign.mjs';
import alignEnumValues from './lib/rules/align-enum-values.mjs';
import alignImports from './lib/rules/align-imports.mjs';
import singleLineJsonObject from './lib/rules/single-line-json-object.mjs';
import vueFacingDecoratorPropRequirements from './lib/rules/vue-facing-decorator-prop-requirements.mjs';

export default {
	'align-assign'                           : alignAssign,
	'align-enum-values'                      : alignEnumValues,
	'align-imports'                          : alignImports,
	'single-line-json-object'                : singleLineJsonObject,
	'vue-facing-decorator-prop-requirements' : vueFacingDecoratorPropRequirements,
};
