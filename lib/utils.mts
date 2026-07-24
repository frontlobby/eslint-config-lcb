import type { Rule, RuleTester, SourceCode } from 'eslint';
import type { Expression, Node } from 'estree';
import _                         from 'lodash';

type NodeWithParent = Node & { parent?: Node | null };

export function hasPropsWithValues(node: Node | null | undefined, attributes: Record<string, unknown>): boolean {
	if (!node) {
		return false;
	}

	return _.isEmpty(attributes) ? true : _.every(attributes, (val, key) => _.get(node, key) === attributes[key]);
}

type SourceCodeContext = Rule.RuleContext & {
	sourceCode?: SourceCode;
	getSourceCode?: () => SourceCode;
};

export function getSourceCode(context: Rule.RuleContext): SourceCode {
	const ctx = context as SourceCodeContext;
	return ctx.sourceCode ?? ctx.getSourceCode!();
}

export function isSingleLine(node: Node): boolean {
	return node.loc!.start.line === node.loc!.end.line;
}

export function getLine(node: Node, sourceCode: SourceCode): string {
	return sourceCode.lines[node.loc!.start.line - 1]!;
}

export function getLineIndent(node: Node, sourceCode: SourceCode): string {
	return getLine(node, sourceCode).match(/^\s*/)![0]!;
}

export function getChildIndent(baseIndent: string): string {
	return `${baseIndent}\t`;
}

export function getWrapMaxLen(maxLen: number, maxLenBuffer: number): number {
	return maxLen + maxLenBuffer;
}

export function getUnwrapMaxLen(maxLen: number, maxLenBuffer: number): number {
	return Math.max(0, maxLen - maxLenBuffer);
}

function isNodeAnIdentifierWithName(node: Node, subNode: string, name: string): boolean {
	return hasPropsWithValues(node, { [`${subNode}.type`] : 'Identifier', [`${subNode}.name`] : name });
}

export function isPropertyAnIdentifierWithName(node: Node, name: string): boolean {
	return isNodeAnIdentifierWithName(node, 'property', name);
}

export function isObjectAnIdentifierWithName(node: Node, name: string): boolean {
	return isNodeAnIdentifierWithName(node, 'object', name);
}

function isUnaryExpression(scope: NodeWithParent, operator: string): boolean {
	return scope.parent?.type === 'UnaryExpression' && (scope.parent as { operator: string }).operator === operator;
}

export function isRequireCallLiteral(node: Node | null | undefined): boolean {
	if (!node || node.type !== 'CallExpression') {
		return false;
	}

	return isNodeAnIdentifierWithName(node, 'callee', 'require')
		&& node.arguments.length === 1
		&& node.arguments[0]!.type === 'Literal';
}

export function isRequireCallArrayExpression(node: Node | null | undefined): boolean {
	if (!node || node.type !== 'CallExpression') {
		return false;
	}

	return isNodeAnIdentifierWithName(node, 'callee', 'require')
		&& node.arguments.length > 0
		&& node.arguments[0]!.type === 'ArrayExpression';
}

export function isRequireCall(node: Node | null | undefined): boolean {
	return isRequireCallLiteral(node) || isRequireCallArrayExpression(node);
}

export function getLiteralModuleNamesFromRequireCall(node: Node): Expression[] {
	if (!isRequireCall(node) || node.type !== 'CallExpression') {
		return [];
	}

	if (isRequireCallLiteral(node)) {
		return node.arguments.filter((arg): arg is Expression => arg.type === 'Literal');
	}

	const firstArgument = node.arguments[0];
	if (!firstArgument || firstArgument.type !== 'ArrayExpression') {
		return [];
	}

	return firstArgument.elements.filter((element): element is Expression => element !== null && element.type === 'Literal');
}

export function lodashAutofix(
	node: NodeWithParent,
	context: Rule.RuleContext,
	type: string,
	fixer: Rule.RuleFixer
): ReturnType<Rule.RuleFixer['replaceText']> | undefined {
	let scope: NodeWithParent = node.parent as NodeWithParent;

	if (!scope || scope.type !== 'CallExpression' || scope.arguments.length > 1) {
		return;
	}

	const arg  = scope.arguments[0] as Node;
	let negate = false;

	if (isUnaryExpression(scope, '!')) {
		negate = !negate;
		scope  = scope.parent as NodeWithParent;
	}

	if (isUnaryExpression(scope, '!')) {
		negate = !negate;
		scope  = scope.parent as NodeWithParent;
	}

	const fixToAppend = negate ? ` !== ${type}` : ` === ${type}`;
	const sourceCode  = getSourceCode(context);
	let fixedCode     = sourceCode.getText(arg) + fixToAppend;

	if (scope.parent?.type === 'BinaryExpression') {
		fixedCode = `(${fixedCode})`;
	}

	return fixer.replaceText(scope, fixedCode);
}

export function namedCase(
	name: string,
	testCase: string,
	options?: Omit<RuleTester.ValidTestCase, 'name' | 'code'>,
): RuleTester.ValidTestCase & { name: string };

export function namedCase(
	name: string,
	testCase: RuleTester.InvalidTestCase,
	options?: Omit<RuleTester.ValidTestCase, 'name' | 'code'>,
): RuleTester.InvalidTestCase & { name: string };

export function namedCase(
	name: string,
	testCase: RuleTester.ValidTestCase,
	options?: Omit<RuleTester.ValidTestCase, 'name' | 'code'>,
): RuleTester.ValidTestCase & { name: string };

export function namedCase(
	name: string,
	testCase: string | RuleTester.ValidTestCase | RuleTester.InvalidTestCase,
	options: Omit<RuleTester.ValidTestCase, 'name' | 'code'> = {}
): (RuleTester.ValidTestCase | RuleTester.InvalidTestCase) & { name: string } {
	const base = typeof testCase === 'string' ? { code : testCase } : testCase;
	return { ...base, ...options, name };
}

export function trimCodeWhitespace<T>(testCases: T): T {
	if (Array.isArray(testCases)) {
		return testCases.map(trimCodeWhitespace) as T;
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
		})) as T;
	}

	return testCases;
}

export function isLiteralTrue(node: Node): boolean {
	return node.type === 'Literal' && node.value === true;
}
