import { isLiteralTrue } from '../utils.mjs';

const COMPONENT_DECORATOR = 'Component';
const PROP_DECORATOR      = 'Prop';
const PACKAGE_NAME        = 'vue-facing-decorator';

export default {
	meta : {
		type : 'problem',
		docs : {
			description : 'Require vue-facing-decorator props to declare prop requirements and readonly fields',
			recommended : false,
		},
		fixable  : 'code',
		schema   : [],
		messages : {
			missingPropOptions     : '@Prop options must include exactly one of `default` or `required : true`.',
			conflictingPropOptions : '@Prop options cannot include both `default` and `required : true`.',
			unsupportedPropOptions : '@Prop options must be a statically verifiable object literal.',
			missingReadonly        : '@Prop-decorated fields in @Component classes must be readonly.',
			emptyPropArguments     : '@Prop() must be replaced with an options object.',
		},
	},

	create(context) {
		let decoratorImports = {
			hasComponentImport : false,
			hasPropImport      : false,
		};

		return {
			Program(node) {
				decoratorImports = getDecoratorImports(node);
			},

			PropertyDefinition(node) {
				if (!decoratorImports.hasComponentImport || !decoratorImports.hasPropImport) {
					return;
				}

				const classNode = getClassNode(node);
				if (!classNode || !hasComponentDecorator(classNode)) {
					return;
				}

				const propDecorator = getPropDecorator(node);
				if (!propDecorator) {
					return;
				}

				reportPropDecorator(node, propDecorator);
				reportReadonly(node);
			},
		};

		function reportPropDecorator(node, decorator) {
			const expression = decorator.expression;
			if (expression.type === 'Identifier') {
				context.report({ node      : decorator, messageId : 'missingPropOptions', });
				return;
			}

			if (expression.type !== 'CallExpression' || expression.callee.type !== 'Identifier' || expression.callee.name !== PROP_DECORATOR) {
				return;
			}

			const analysis = analyzePropCall(expression);
			if (analysis.kind === 'valid') {
				return;
			}

			if (analysis.kind === 'emptyPropArguments') {
				context.report({
					node      : decorator,
					messageId : analysis.kind,
					fix(fixer) {
						return fixer.replaceTextRange(expression.range, 'Prop({ required : true })');
					},
				});
				return;
			}

			context.report({
				node      : decorator,
				messageId : analysis.kind,
			});
		}

		function reportReadonly(node) {
			if (node.readonly) {
				return;
			}

			context.report({
				node      : node.key || node,
				messageId : 'missingReadonly',
				fix(fixer) {
					return node.key ? fixer.insertTextBefore(node.key, 'readonly ') : null;
				},
			});
		}
	},
};

function isExactNamedImport(specifier, importedName) {
	return specifier.type === 'ImportSpecifier'
		&& specifier.imported.type === 'Identifier'
		&& specifier.imported.name === importedName
		&& specifier.local.type === 'Identifier'
		&& specifier.local.name === importedName;
}

function getDecoratorImports(programNode) {
	const imports = {
		hasComponentImport : false,
		hasPropImport      : false,
	};

	for (const node of programNode.body) {
		if (node.type !== 'ImportDeclaration' || node.source.value !== PACKAGE_NAME) {
			continue;
		}

		for (const specifier of node.specifiers) {
			if (isExactNamedImport(specifier, COMPONENT_DECORATOR)) {
				imports.hasComponentImport = true;
			}

			if (isExactNamedImport(specifier, PROP_DECORATOR)) {
				imports.hasPropImport = true;
			}
		}
	}

	return imports;
}

function getDecoratorName(expression) {
	if (!expression) {
		return null;
	}

	if (expression.type === 'Identifier') {
		return expression.name;
	}

	if (expression.type === 'CallExpression' && expression.callee.type === 'Identifier') {
		return expression.callee.name;
	}

	return null;
}

function getPropDecorator(node) {
	return (node.decorators || []).find(decorator => getDecoratorName(decorator.expression) === PROP_DECORATOR) || null;
}

function hasComponentDecorator(node) {
	return (node.decorators || []).some(decorator => getDecoratorName(decorator.expression) === COMPONENT_DECORATOR);
}

function getStaticPropertyName(property) {
	if (!property || property.computed || property.type !== 'Property' || property.kind !== 'init' || property.method) {
		return null;
	}

	if (property.key.type === 'Identifier') {
		return property.key.name;
	}

	if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
		return property.key.value;
	}

	return null;
}

function analyzePropCall(expression) {
	if (expression.arguments.length === 0) {
		return { kind : 'emptyPropArguments' };
	}

	if (expression.arguments.length !== 1) {
		return { kind : 'unsupportedPropOptions' };
	}

	const [ arg ] = expression.arguments;
	if (arg.type !== 'ObjectExpression') {
		return { kind : 'unsupportedPropOptions' };
	}

	let hasDefault      = false;
	let hasRequiredTrue = false;

	for (const property of arg.properties) {
		if (property.type !== 'Property') {
			return { kind : 'unsupportedPropOptions' };
		}

		const propertyName = getStaticPropertyName(property);
		if (!propertyName) {
			return { kind : 'unsupportedPropOptions' };
		}

		if (propertyName === 'default') {
			hasDefault = true;
		}

		if (propertyName === 'required' && isLiteralTrue(property.value)) {
			hasRequiredTrue = true;
		}
	}

	if (hasDefault && hasRequiredTrue) {
		return { kind : 'conflictingPropOptions' };
	}

	if (!hasDefault && !hasRequiredTrue) {
		return { kind : 'missingPropOptions' };
	}

	return { kind : 'valid' };
}

function getClassNode(node) {
	const parent = node.parent;

	if (!parent || parent.type !== 'ClassBody') {
		return null;
	}

	const classNode = parent.parent;

	if (!classNode || (classNode.type !== 'ClassDeclaration' && classNode.type !== 'ClassExpression')) {
		return null;
	}

	return classNode;
}

