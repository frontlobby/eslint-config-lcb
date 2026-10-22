import type { AST, Rule, SourceCode } from 'eslint';
import type { Node }                  from 'estree';

/**
 * The first `=` after `nameNode` that starts before `valueStart`, with the token before it. Null when there is no such
 * `=`, or when anything but spaces or tabs, such as a comment, sits between the two tokens, since the alignment fix
 * rewrites that gap.
 */
export function findAlignedToken(sourceCode: SourceCode, nameNode: Node, valueStart: number): AlignedToken | null {
	let token = sourceCode.getTokenAfter(nameNode);

	while (token && token.range[0] < valueStart) {
		if (token.value === '=') {
			const tokenBefore = sourceCode.getTokenBefore(token)!;

			return /^[ \t]*$/.test(sourceCode.text.slice(tokenBefore.range[1], token.range[0])) ? { equalsToken : token, tokenBefore } : null;
		}

		token = sourceCode.getTokenAfter(token);
	}

	return null;
}

/**
 * Reports each line whose `=` is not in the column one past the widest token before an `=` in the run, with a fix that
 * pads the gap with spaces. A run of fewer than two lines has nothing to align with.
 */
export function reportMisalignedRun<T>(context: Rule.RuleContext, run: AlignedLine<T>[], message: string): void {
	if (run.length < 2) {
		return;
	}

	const equalsColumn = Math.max(...run.map(line => line.tokenBefore.loc.end.column)) + 1;

	for (const line of run) {
		if (line.equalsToken.loc.start.column === equalsColumn) {
			continue;
		}

		context.report({
			node : line.member as unknown as Rule.Node,
			loc  : line.equalsToken.loc.start,
			message,
			fix  : fixer => fixer.replaceTextRange(
				[ line.tokenBefore.range[1], line.equalsToken.range[0] ],
				' '.repeat(equalsColumn - line.tokenBefore.loc.end.column)
			),
		});
	}
}

/** Splits `items`, in order, wherever `isSameRun` says two neighbours do not belong together. */
export function splitIntoRuns<T>(items: T[], isSameRun: (previous: T, next: T) => boolean): T[][] {
	const runs: T[][] = [];

	items.forEach((item, index) => {
		if (index === 0 || !isSameRun(items[index - 1]!, item)) {
			runs.push([]);
		}

		runs.at(-1)!.push(item);
	});

	return runs;
}

export interface AlignedToken {
	equalsToken : AST.Token;
	tokenBefore : AST.Token;
}

/** A line to align, with the node a misalignment is reported on. */
export interface AlignedLine<T> extends AlignedToken {
	member : T;
}
