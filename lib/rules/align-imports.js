/**
 * Align import statements.
 */
'use strict';

class ImportAlignment {

	constructor(context) {
		this.context = context;
		this.options = Object.assign({
			// default options
			collapseExtraSpaces : false,
			minColumnWidth      : 0,
			maxSpaces           : 25,
		}, context.options[0]);
	}

	static create(context) {
		const importAlignment = new ImportAlignment(context);

		return {
			ImportDeclaration : node => {
				if (!importAlignment.isSuitableImport(node)) {
					return;
				}

				// get the prevTokenEnd and fromTokenStart of all lines
				const lines           = importAlignment.findSurroundingImports(node).map(node => importAlignment.getLineInfo(node));
				const line            = lines.find(line => line.node === node);
				const alignmentColumn = importAlignment.getAlignmentColumn(line, lines);

				// check alignment of current line
				if (line.fromTokenStart !== alignmentColumn) {
					importAlignment.reportUnalignedImportStatement(node, alignmentColumn - line.fromTokenStart);
				}
			},
		};
	}

	getFromKeyword(node) {
		if (node.type !== 'ImportDeclaration' || node.specifiers.length < 1) {
			return null;
		}

		const sourceCode = this.context.getSourceCode();
		let token        = sourceCode.getTokenAfter(node.specifiers[node.specifiers.length - 1]);

		while (token.type !== 'Identifier' || token.value !== 'from') {
			token = sourceCode.getTokenAfter(token);
		}

		return token;
	}

	reportUnalignedImportStatement(node, diff) {
		const sourceCode = this.context.getSourceCode();

		const fromKeyword   = this.getFromKeyword(node);
		const previousToken = sourceCode.getTokenBefore(fromKeyword);

		this.context.report({
			node,
			loc     : fromKeyword.loc.start,
			message : 'Unaligned import statement',
			fix     : function(fixer) {
				if (diff < 0) {
					const index = sourceCode.getIndexFromLoc(previousToken.loc.end);
					return fixer.removeRange([ index, index + Math.abs(diff) ]);
				}
				return fixer.insertTextAfter(previousToken, ' '.repeat(diff));
			},
		});
	}

	isSingleLine(node) {
		const sourceCode = this.context.getSourceCode();

		const first = sourceCode.getFirstToken(node);
		const last  = sourceCode.getLastToken(node);

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
		const sourceCode = this.context.getSourceCode();
		const fromToken  = this.getFromKeyword(node);
		const prevToken  = sourceCode.getTokenBefore(fromToken);

		return {
			node,
			prevTokenEnd   : prevToken.loc.end.column,
			fromTokenStart : fromToken.loc.start.column,
		};
	}

	getAlignmentColumn(currentLine, lines) {
		let alignmentColumn;
		const minPrevTokenEnd = Math.min(...lines.map(line => line.prevTokenEnd));
		const origLines       = lines;

		while (lines.includes(currentLine)) {
			if (this.options.collapseExtraSpaces) {
				// use greatest endpoint of previous tokens as alignment column
				// add 1 for the space
				alignmentColumn = 1 + Math.max(...lines.map(line => line.prevTokenEnd));
			}
			else {
				// use greatest start of from tokens as alignment column
				alignmentColumn = Math.max(0, ...lines.map(line => line.fromTokenStart));
			}

			// check if alignment column is lower than minColumnWidth, if defined
			if (this.options.minColumnWidth) {
				alignmentColumn = Math.max(alignmentColumn, this.options.minColumnWidth);
			}

			// if aligning on alignmentColumn would be bigger that maxSpaces, then eliminate the line with only a single space and compute again
			if (alignmentColumn - minPrevTokenEnd <= this.options.maxSpaces) {
				break;
			}

			const maxPrevTokenEnd = Math.max(...lines.map(line => line.prevTokenEnd));
			lines                 = lines.filter(line => line.prevTokenEnd < maxPrevTokenEnd);
		}

		// if the current line got filtered out, try again but this time exclude all remaining lines
		if (!lines.includes(currentLine)) {
			return this.getAlignmentColumn(currentLine, origLines.filter(line => !lines.includes(line)));
		}

		return alignmentColumn;
	}
}

module.exports = {
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
