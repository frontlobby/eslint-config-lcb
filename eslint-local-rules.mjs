import alignAssign from './lib/rules/align-assign.mjs';
import alignEnumValues from './lib/rules/align-enum-values.mjs';
import alignImports from './lib/rules/align-imports.mjs';
import vueFacingDecoratorPropRequirements from './lib/rules/vue-facing-decorator-prop-requirements.mjs';

export default {
	'align-assign'                           : alignAssign,
	'align-enum-values'                      : alignEnumValues,
	'align-imports'                          : alignImports,
	'vue-facing-decorator-prop-requirements' : vueFacingDecoratorPropRequirements,
};
