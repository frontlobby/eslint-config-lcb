import _ from 'lodash';
import { BaseESLintRule } from "../BaseESLintRule.mjs";
import { isLiteralTrue } from "../utils.mjs";
const COMPONENT_DECORATOR = 'Component';
const PROP_DECORATOR = 'Prop';
const PACKAGE_NAME = 'vue-facing-decorator';
/**
 * Require vue-facing-decorator props to declare prop requirements and readonly fields.
 */
export class VueFacingDecoratorPropRequirements extends BaseESLintRule {
    static meta = {
        type: 'problem',
        docs: {
            description: 'Require vue-facing-decorator props to declare prop requirements and readonly fields',
            recommended: false,
        },
        fixable: 'code',
        schema: [],
        messages: {
            missingPropOptions: '@Prop options must include exactly one of `default` or `required : true`.',
            conflictingPropOptions: '@Prop options cannot include both `default` and `required : true`.',
            unsupportedPropOptions: '@Prop options must be a statically verifiable object literal.',
            missingReadonly: '@Prop-decorated fields in @Component classes must be readonly.',
            emptyPropArguments: '@Prop() must be replaced with an options object.',
        },
    };
    context;
    decoratorImports;
    constructor(context) {
        super();
        this.context = context;
        this.decoratorImports = { hasComponentImport: false, hasPropImport: false };
    }
    static create(context) {
        const rule = new VueFacingDecoratorPropRequirements(context);
        return {
            Program(node) {
                rule.updateDecoratorImports(node);
            },
            PropertyDefinition(node) {
                rule.checkPropertyDefinition(node);
            },
        };
    }
    updateDecoratorImports(node) {
        this.decoratorImports = getDecoratorImports(node);
    }
    checkPropertyDefinition(node) {
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
    reportPropDecorator(node, decorator) {
        const expression = decorator.expression;
        if (expression.type === 'Identifier') {
            this.context.report({ node: decorator, messageId: 'missingPropOptions' });
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
                node: decorator,
                messageId: analysis.kind,
                fix(fixer) {
                    return fixer.replaceTextRange(expression.range, 'Prop({ required : true })');
                },
            });
            return;
        }
        this.context.report({ node: decorator, messageId: analysis.kind });
    }
    reportReadonly(node) {
        if (node.readonly) {
            return;
        }
        this.context.report({
            node: node.key || node,
            messageId: 'missingReadonly',
            fix: fixer => (node.key ? fixer.insertTextBefore(node.key, 'readonly ') : null),
        });
    }
}
function isExactNamedImport(specifier, importedName) {
    return specifier.type === 'ImportSpecifier'
        && specifier.imported.type === 'Identifier'
        && specifier.imported.name === importedName
        && specifier.local.type === 'Identifier'
        && specifier.local.name === importedName;
}
function getDecoratorImports(programNode) {
    const imports = { hasComponentImport: false, hasPropImport: false };
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
    return expression.type === 'CallExpression' && expression.callee.type === 'Identifier' ? expression.callee.name : null;
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
    return property.key.type === 'Literal' && typeof property.key.value === 'string' ? property.key.value : null;
}
function analyzePropCall(expression) {
    if (_.isEmpty(expression.arguments)) {
        return { kind: 'emptyPropArguments' };
    }
    if (expression.arguments.length !== 1) {
        return { kind: 'unsupportedPropOptions' };
    }
    const [arg] = expression.arguments;
    if (arg.type !== 'ObjectExpression') {
        return { kind: 'unsupportedPropOptions' };
    }
    let hasDefault = false;
    let hasRequiredTrue = false;
    for (const property of arg.properties) {
        if (property.type !== 'Property') {
            return { kind: 'unsupportedPropOptions' };
        }
        const propertyName = getStaticPropertyName(property);
        if (!propertyName) {
            return { kind: 'unsupportedPropOptions' };
        }
        if (propertyName === 'default') {
            hasDefault = true;
        }
        if (propertyName === 'required' && isLiteralTrue(property.value)) {
            hasRequiredTrue = true;
        }
    }
    if (hasDefault && hasRequiredTrue) {
        return { kind: 'conflictingPropOptions' };
    }
    return !hasDefault && !hasRequiredTrue ? { kind: 'missingPropOptions' } : { kind: 'valid' };
}
function getClassNode(node) {
    const parent = node.parent;
    if (!parent || parent.type !== 'ClassBody') {
        return null;
    }
    const classNode = parent.parent;
    return !classNode || (classNode.type !== 'ClassDeclaration' && classNode.type !== 'ClassExpression') ? null : classNode;
}
