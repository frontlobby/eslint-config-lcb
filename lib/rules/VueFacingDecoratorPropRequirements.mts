import type { Rule } from 'eslint';
import type {
	CallExpression, ClassBody, ClassDeclaration, ClassExpression, Expression, Identifier, ImportDeclaration, ImportSpecifier, ObjectExpression,
	Program, Property
} from 'estree';
import _ from 'lodash';

import { BaseESLintRule } from '../BaseESLintRule.mts';
import { isLiteralTrue }  from '../utils.mts';

const COMPONENT_DECORATOR = 'Component';
const PROP_DECORATOR      = 'Prop';
const PACKAGE_NAME        = 'vue-facing-decorator';

/**
 * Require vue-facing-decorator props to declare prop requirements and readonly fields.
 */
export class VueFacingDecoratorPropRequirements extends BaseESLintRule {

	static meta = {
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
	} as const;

	context: Rule.RuleContext;
	decoratorImports: DecoratorImports;

	constructor(context: Rule.RuleContext) {
		super();
		this.context          = context;
		this.decoratorImports = { hasComponentImport : false, hasPropImport : false };
	}

	static create(context: Rule.RuleContext): Rule.RuleListener {
		const rule = new VueFacingDecoratorPropRequirements(context);

		return {
			Program(node: Program) {
				rule.updateDecoratorImports(node);
			},

			PropertyDefinition(node) {
				rule.checkPropertyDefinition(node as PropertyDefinition);
			},
		};
	}

	updateDecoratorImports(node: Program): void {
		this.decoratorImports = getDecoratorImports(node);
	}

	checkPropertyDefinition(node: PropertyDefinition): void {
		if (!this.decoratorImports.hasComponentImport || !this.decoratorImports.hasPropImport) {
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

		this.reportPropDecorator(node, propDecorator);
		this.reportReadonly(node);
	}

	reportPropDecorator(node: PropertyDefinition, decorator: Decorator): void {
		const expression = decorator.expression;
		if (expression.type === 'Identifier') {
			this.context.report({ node : decorator, messageId : 'missingPropOptions' });
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
			this.context.report({
				node      : decorator,
				messageId : analysis.kind,
				fix(fixer) {
					return fixer.replaceTextRange(expression.range!, 'Prop({ required : true })');
				},
			});
			return;
		}

		this.context.report({ node : decorator, messageId : analysis.kind });
	}

	reportReadonly(node: PropertyDefinition): void {
		if (node.readonly) {
			return;
		}

		this.context.report({
			node      : node.key || node,
			messageId : 'missingReadonly',
			fix       : fixer => (node.key ? fixer.insertTextBefore(node.key, 'readonly ') : null),
		});
	}

}

interface Decorator {
	type: 'Decorator';
	expression: Expression;
	range: [number, number];
}

interface PropertyDefinition {
	type: 'PropertyDefinition';
	key: Expression;
	readonly?: boolean;
	decorators?: Decorator[];
	parent?: ClassBodyWithParent;
	loc?: NonNullable<Identifier['loc']>;
}

interface ClassBodyWithParent extends ClassBody {
	parent?: ClassDeclaration | ClassExpression;
}

interface ClassWithDecorators {
	type: 'ClassDeclaration' | 'ClassExpression';
	decorators?: Decorator[];
	body: ClassBodyWithParent;
}

interface DecoratorImports {
	hasComponentImport: boolean;
	hasPropImport: boolean;
}

type PropCallAnalysis =
	| { kind: 'valid' }
	| { kind: 'emptyPropArguments' }
	| { kind: 'unsupportedPropOptions' }
	| { kind: 'conflictingPropOptions' }
	| { kind: 'missingPropOptions' };

function isExactNamedImport(specifier: ImportSpecifier, importedName: string): boolean {
	return specifier.type === 'ImportSpecifier'
		&& specifier.imported.type === 'Identifier'
		&& specifier.imported.name === importedName
		&& specifier.local.type === 'Identifier'
		&& specifier.local.name === importedName;
}

function getDecoratorImports(programNode: Program): DecoratorImports {
	const imports: DecoratorImports = { hasComponentImport : false, hasPropImport : false };

	for (const node of programNode.body) {
		if (node.type !== 'ImportDeclaration' || (node as ImportDeclaration).source.value !== PACKAGE_NAME) {
			continue;
		}

		for (const specifier of (node as ImportDeclaration).specifiers) {
			if (isExactNamedImport(specifier as ImportSpecifier, COMPONENT_DECORATOR)) {
				imports.hasComponentImport = true;
			}

			if (isExactNamedImport(specifier as ImportSpecifier, PROP_DECORATOR)) {
				imports.hasPropImport = true;
			}
		}
	}

	return imports;
}

function getDecoratorName(expression: Expression | null | undefined): string | null {
	if (!expression) {
		return null;
	}

	if (expression.type === 'Identifier') {
		return expression.name;
	}

	return expression.type === 'CallExpression' && expression.callee.type === 'Identifier' ? expression.callee.name : null;
}

function getPropDecorator(node: PropertyDefinition): Decorator | null {
	return (node.decorators || []).find(decorator => getDecoratorName(decorator.expression) === PROP_DECORATOR) || null;
}

function hasComponentDecorator(node: ClassWithDecorators): boolean {
	return (node.decorators || []).some(decorator => getDecoratorName(decorator.expression) === COMPONENT_DECORATOR);
}

function getStaticPropertyName(property: Property): string | null {
	if (!property || property.computed || property.type !== 'Property' || property.kind !== 'init' || property.method) {
		return null;
	}

	if (property.key.type === 'Identifier') {
		return property.key.name;
	}

	return property.key.type === 'Literal' && typeof property.key.value === 'string' ? property.key.value : null;
}

function analyzePropCall(expression: CallExpression): PropCallAnalysis {
	if (_.isEmpty(expression.arguments)) {
		return { kind : 'emptyPropArguments' };
	}

	if (expression.arguments.length !== 1) {
		return { kind : 'unsupportedPropOptions' };
	}

	const [ arg ] = expression.arguments;
	if (arg!.type !== 'ObjectExpression') {
		return { kind : 'unsupportedPropOptions' };
	}

	let hasDefault      = false;
	let hasRequiredTrue = false;

	for (const property of (arg as ObjectExpression).properties) {
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

	return !hasDefault && !hasRequiredTrue ? { kind : 'missingPropOptions' } : { kind : 'valid' };
}

function getClassNode(node: PropertyDefinition): ClassWithDecorators | null {
	const parent = node.parent;

	if (!parent || parent.type !== 'ClassBody') {
		return null;
	}

	const classNode = parent.parent;

	return !classNode || (classNode.type !== 'ClassDeclaration' && classNode.type !== 'ClassExpression') ? null : classNode as ClassWithDecorators;
}
