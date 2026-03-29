/**
 * Align import statements.
 */
import { getSourceCode } from '../utils.mjs';

class ImportAlignment {

	constructor(context) {
		this.context    = context;
		this.sourceCode = getSourceCode(context);
		this.hasExplicitCollapseExtraSpaces = Object.prototype.hasOwnProperty.call(context.options[0] || {}, 'collapseExtraSpaces');
		this.options    = Object.assign({
			// default options
			collapseExtraSpaces : false,
			minColumnWidth      : 0,
			maxSpaces           : 25,
		}, context.options[0]);
	}

	static create(context) {
		const importAlignment = new ImportAlignment(context);

		return {
				ImportDeclaration(node) {
					if (!importAlignment.isSuitableImport(node)) {
						return;
					}

					// get the prevTokenEnd and fromTokenStart of all lines
					const surroundingLines                 = importAlignment.findSurroundingImports(node).map(node => importAlignment.getLineInfo(node));
					const line                            = surroundingLines.find(line => line.node === node);
					const { alignmentColumn, groupLines } = importAlignment.getAlignmentInfo(line, surroundingLines);
					const shouldCollapse                  = importAlignment.shouldCollapseExtraSpaces(groupLines);
					const lineDiffs                       = groupLines.map(line => ({
						diff : alignmentColumn - line.fromTokenStart,
						line,
					}));

				if (importAlignment.shouldReportGroupedDiff(lineDiffs, shouldCollapse)) {
					const lineDiff = lineDiffs.find(({ diff }) => diff < 0);
					if (lineDiff && lineDiff.line.node === node) {
						importAlignment.reportUnalignedImportGroup(lineDiffs);
					}
					return;
				}

				// check alignment of current line
				if (line.fromTokenStart !== alignmentColumn) {
					importAlignment.reportUnalignedImportStatement(node, alignmentColumn - line.fromTokenStart);
				}
			}
		}
	}

	getFromKeyword(node) {
		if (node.type !== 'ImportDeclaration' || node.specifiers.length < 1) {
			return null;
		}

		const sourceCode = this.sourceCode;
		let token        = sourceCode.getTokenAfter(node.specifiers[node.specifiers.length - 1]);

		while (token.type !== 'Identifier' || token.value !== 'from') {
			token = sourceCode.getTokenAfter(token);
		}

		return token;
	}

	reportUnalignedImportStatement(node, diff) {
		this.context.report({
			node,
			loc     : this.getFromKeyword(node).loc.start,
			message : 'Unaligned import statement',
			fix     : fixer => this.getImportSpacingFix(node, diff, fixer),
		});
	}

	reportUnalignedImportGroup(lineDiffs) {
		const anchor = lineDiffs.find(({ diff }) => diff < 0);

		this.context.report({
			node    : anchor.line.node,
			loc     : this.getFromKeyword(anchor.line.node).loc.start,
			message : 'Unaligned import statement',
			fix     : fixer => lineDiffs
				.filter(({ diff }) => diff !== 0)
				.map(({ diff, line }) => this.getImportSpacingFix(line.node, diff, fixer)),
		});
	}

	getImportSpacingFix(node, diff, fixer) {
		const sourceCode    = this.sourceCode;
		const fromKeyword   = this.getFromKeyword(node);
		const previousToken = sourceCode.getTokenBefore(fromKeyword);

		if (diff < 0) {
			const index = sourceCode.getIndexFromLoc(previousToken.loc.end);
			return fixer.removeRange([ index, index + Math.abs(diff) ]);
		}

		return fixer.insertTextAfter(previousToken, ' '.repeat(diff));
	}

	isSingleLine(node) {
		const sourceCode = this.sourceCode;
		const first      = sourceCode.getFirstToken(node);
		const last       = sourceCode.getLastToken(node);

		return first.loc.start.line === last.loc.end.line;
	}

	isSuitableImport(node) {
		return node.type === 'ImportDeclaration' && node.specifiers.length >= 1 && this.isSingleLine(node);
	}

	findSurroundingImports(node) {
		const self = this;

		return [
			...findImport(node, -1),
			node,
			...findImport(node, +1),
		];

		function findImport(node, direction) {
			const parentBody   = node.parent.body;
			const nodeLocation = parentBody.indexOf(node);
			const currentLine  = node.loc.start.line;

			const neighbouringNode = parentBody[nodeLocation + direction];
			if (neighbouringNode && self.isSuitableImport(neighbouringNode) && neighbouringNode.loc.start.line === currentLine + direction) {
				const neighbours = findImport(neighbouringNode, direction);
				return direction < 0 ? [ ...neighbours, neighbouringNode ] : [ neighbouringNode, ...neighbours ];
			}
			return [];
		}
	}

	getLineInfo(node) {
		const sourceCode = this.sourceCode;
		const fromToken  = this.getFromKeyword(node);
		const prevToken  = sourceCode.getTokenBefore(fromToken);

		return {
			node,
			prevTokenEnd   : prevToken.loc.end.column,
			fromTokenStart : fromToken.loc.start.column,
		};
	}

	shouldReportGroupedDiff(lineDiffs, shouldCollapse) {
		const negativeDiffs = lineDiffs.filter(({ diff }) => diff < 0);
		const positiveDiffs = lineDiffs.filter(({ diff }) => diff > 0);

		return shouldCollapse && negativeDiffs.length === 1 && positiveDiffs.length > 0;
	}

	getAlignmentInfo(currentLine, lines) {
		if (!this.shouldCollapseExtraSpaces(lines)) {
			return {
				alignmentColumn : this.applyMinColumnWidth(Math.max(0, ...lines.map(line => line.fromTokenStart))),
				groupLines      : lines,
			};
		}

		const widestResult   = this.resolveCollapsedGroup(currentLine, lines, 'widest');
		const shortestResult = this.resolveCollapsedGroup(currentLine, lines, 'shortest');

		if (shortestResult.groupLines.length > widestResult.groupLines.length) {
			return shortestResult;
		}

		return widestResult;
	}

	applyMinColumnWidth(alignmentColumn) {
		if (this.options.minColumnWidth) {
			return Math.max(alignmentColumn, this.options.minColumnWidth);
		}

		return alignmentColumn;
	}

	shouldCollapseExtraSpaces(lines) {
		if (this.options.collapseExtraSpaces) {
			return true;
		}

		if (this.hasExplicitCollapseExtraSpaces) {
			return false;
		}

		return new Set(lines.map(line => line.prevTokenEnd)).size === 1;
	}

	resolveCollapsedGroup(currentLine, lines, strategy) {
		let candidateLines = lines;

		while (candidateLines.includes(currentLine)) {
			const minPrevTokenEnd = Math.min(...candidateLines.map(line => line.prevTokenEnd));
			const maxPrevTokenEnd = Math.max(...candidateLines.map(line => line.prevTokenEnd));
			const alignmentColumn = this.applyMinColumnWidth(1 + maxPrevTokenEnd);

			// if aligning on alignmentColumn would be bigger that maxSpaces, then trim one side and compute again
			if (alignmentColumn - minPrevTokenEnd <= this.options.maxSpaces) {
				return {
					alignmentColumn,
					groupLines : candidateLines,
				};
			}

			const nextLines = strategy === 'widest'
				? candidateLines.filter(line => line.prevTokenEnd < maxPrevTokenEnd)
				: candidateLines.filter(line => line.prevTokenEnd > minPrevTokenEnd);

			if (nextLines.length === 0) {
				return {
					alignmentColumn,
					groupLines : candidateLines,
				};
			}

			if (nextLines.includes(currentLine)) {
				candidateLines = nextLines;
				continue;
			}

			return this.resolveCollapsedGroup(currentLine, candidateLines.filter(line => !nextLines.includes(line)), strategy);
		}

		return {
			alignmentColumn : this.applyMinColumnWidth(Math.max(0, ...lines.map(line => line.fromTokenStart))),
			groupLines      : lines,
		};
	}
}

export default {
	meta : {
		fixable : 'whitespace',
		schema  : [
			{
				type       : 'object',
				properties : {
					collapseExtraSpaces : {
						type : 'boolean',
					},
					minColumnWidth : {
						type : 'number',
					},
					maxSpaces : {
						type : 'number',
					},
				},
				additionalProperties : false,
			},
		],
	},

	create : ImportAlignment.create,
};
