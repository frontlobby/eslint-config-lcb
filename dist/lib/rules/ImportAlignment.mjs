import _ from 'lodash';
import { BaseESLintRule } from "../BaseESLintRule.mjs";
import { getChildIndent, getLine, getLineIndent, getSourceCode, getUnwrapMaxLen, getWrapMaxLen, isSingleLine } from "../utils.mjs";
const messageExceedsMaxLen = 'Import statement exceeds maximum line length';
const messageShouldUnwrap = 'Import statement should be on a single line when it fits within the line limit';
/**
 * Align import statements.
 *
 * ## `maxLen` / `maxLenBuffer`
 *
 * When `maxLen` is set, named imports are wrapped onto multiple lines if a
 * single-line statement would exceed that length.
 *
 * Multiline imports may be collapsed back to one line when their collapsed
 * length fits within the limit. Without a buffer, imports sitting just above
 * `maxLen` can ping-pong: wrap (line too long) → unwrap (collapsed length still
 * fits) → wrap again on the next lint pass.
 *
 * `maxLenBuffer` adds hysteresis on both sides of `maxLen`:
 *
 * - **Wrap** when single-line length `> maxLen + maxLenBuffer`
 * - **Unwrap** when collapsed length `<= maxLen - maxLenBuffer`
 *
 * Lengths between those thresholds are left unchanged, which prevents
 * wrap/unwrap oscillation near the limit.
 *
 * Default `maxLenBuffer` is `5`. Set to `0` to wrap above `maxLen` and unwrap
 * at or below `maxLen` (legacy behavior).
 *
 * @example maxLen 140, maxLenBuffer 10
 * - Single line 141 chars → stay single line (141 <= 150)
 * - Single line 151 chars → wrap to multiline
 * - Collapsed 138 chars → stay multiline (138 > 130)
 * - Collapsed 129 chars → unwrap to single line (129 <= 130)
 */
export class ImportAlignment extends BaseESLintRule {
    static meta = {
        fixable: 'whitespace',
        docs: {
            description: 'Align import statements and wrap long named imports. See rule source for `maxLenBuffer` hysteresis.',
            category: 'Stylistic Issues',
            recommended: false,
        },
        schema: [{
                type: 'object',
                properties: {
                    collapseExtraSpaces: {
                        type: 'boolean',
                    },
                    minColumnWidth: {
                        type: 'number',
                    },
                    maxLen: {
                        type: 'integer',
                        minimum: 1,
                    },
                    maxLenBuffer: {
                        type: 'integer',
                        minimum: 0,
                    },
                    maxSpaces: {
                        type: 'number',
                    },
                },
                additionalProperties: false,
            }],
    };
    context;
    sourceCode;
    hasExplicitCollapseExtraSpaces;
    options;
    constructor(context) {
        super();
        this.context = context;
        this.sourceCode = getSourceCode(context);
        this.hasExplicitCollapseExtraSpaces = Object.prototype.hasOwnProperty.call(context.options[0] || {}, 'collapseExtraSpaces');
        this.options = Object.assign({
            collapseExtraSpaces: false,
            minColumnWidth: 0,
            maxSpaces: 25,
            maxLenBuffer: 5,
        }, context.options[0]);
    }
    static create(context) {
        const importAlignment = new ImportAlignment(context);
        return {
            ImportDeclaration(node) {
                const importNode = node;
                if (importAlignment.checkMaxLen(importNode)) {
                    return;
                }
                if (!importAlignment.isSuitableImport(importNode)) {
                    return;
                }
                const surroundingLines = importAlignment.findSurroundingImports(importNode).map(surroundingNode => importAlignment.getLineInfo(surroundingNode));
                const line = surroundingLines.find(surroundingLine => surroundingLine.node === importNode);
                const { alignmentColumn, groupLines } = importAlignment.getAlignmentInfo(line, surroundingLines);
                const shouldCollapse = importAlignment.shouldCollapseExtraSpaces(groupLines);
                const lineDiffs = groupLines.map(groupLine => ({
                    diff: alignmentColumn - groupLine.fromTokenStart,
                    line: groupLine,
                }));
                if (importAlignment.shouldReportGroupedDiff(lineDiffs, shouldCollapse)) {
                    const lineDiff = lineDiffs.find(({ diff }) => diff < 0);
                    if (lineDiff && lineDiff.line.node === importNode) {
                        importAlignment.reportUnalignedImportGroup(lineDiffs);
                    }
                    return;
                }
                if (line.fromTokenStart !== alignmentColumn) {
                    importAlignment.reportUnalignedImportStatement(importNode, alignmentColumn - line.fromTokenStart);
                }
            },
        };
    }
    checkMaxLen(node) {
        const { maxLen } = this.options;
        if (!maxLen || !node.specifiers.some(specifier => specifier.type === 'ImportSpecifier')) {
            return false;
        }
        const sourceCode = this.sourceCode;
        const wrapMaxLen = this.getWrapMaxLen();
        if (isSingleLine(node)) {
            if (getLine(node, sourceCode).length <= wrapMaxLen) {
                return false;
            }
            this.context.report({
                node,
                message: messageExceedsMaxLen,
                fix: fixer => replaceImportText(fixer, sourceCode, node, buildWrappedImportText(sourceCode, node, wrapMaxLen)),
            });
            return true;
        }
        if (getCollapsedLineLength(sourceCode, node) <= this.getUnwrapMaxLen()) {
            this.context.report({
                node,
                message: messageShouldUnwrap,
                fix: fixer => replaceImportText(fixer, sourceCode, node, buildSingleLineImportText(sourceCode, node)),
            });
            return true;
        }
        for (let lineNumber = node.loc.start.line; lineNumber <= node.loc.end.line; lineNumber++) {
            if (sourceCode.lines[lineNumber - 1].length > wrapMaxLen) {
                this.context.report({
                    node,
                    message: messageExceedsMaxLen,
                    fix: fixer => replaceImportText(fixer, sourceCode, node, buildWrappedImportText(sourceCode, node, wrapMaxLen)),
                });
                return true;
            }
        }
        const canonical = buildWrappedImportText(sourceCode, node, wrapMaxLen);
        const current = sourceCode.getText(node);
        if (collapseImportLayout(current) !== collapseImportLayout(canonical) || !hasCanonicalMultilineImportIndent(sourceCode, node, current)) {
            this.context.report({
                node,
                message: messageExceedsMaxLen,
                fix: fixer => replaceImportText(fixer, sourceCode, node, buildWrappedImportText(sourceCode, node, wrapMaxLen)),
            });
            return true;
        }
        if (!hasImportSemicolon(sourceCode, node)) {
            this.context.report({
                node,
                message: messageExceedsMaxLen,
                fix: fixer => replaceImportText(fixer, sourceCode, node, buildWrappedImportText(sourceCode, node, wrapMaxLen)),
            });
            return true;
        }
        return false;
    }
    getWrapMaxLen() {
        const { maxLen, maxLenBuffer } = this.options;
        return getWrapMaxLen(maxLen, maxLenBuffer);
    }
    getUnwrapMaxLen() {
        const { maxLen, maxLenBuffer } = this.options;
        return getUnwrapMaxLen(maxLen, maxLenBuffer);
    }
    getFromKeyword(node) {
        if (node.type !== 'ImportDeclaration' || _.isEmpty(node.specifiers)) {
            return null;
        }
        const sourceCode = this.sourceCode;
        let token = sourceCode.getTokenAfter(node.specifiers[node.specifiers.length - 1]);
        while (token.type !== 'Identifier' || token.value !== 'from') {
            token = sourceCode.getTokenAfter(token);
        }
        return token;
    }
    reportUnalignedImportStatement(node, diff) {
        this.context.report({
            node,
            loc: this.getFromKeyword(node).loc.start,
            message: 'Unaligned import statement',
            fix: fixer => this.getImportSpacingFix(node, diff, fixer),
        });
    }
    reportUnalignedImportGroup(lineDiffs) {
        const anchor = lineDiffs.find(({ diff }) => diff < 0);
        this.context.report({
            node: anchor.line.node,
            loc: this.getFromKeyword(anchor.line.node).loc.start,
            message: 'Unaligned import statement',
            fix: fixer => lineDiffs
                .filter(({ diff }) => diff !== 0)
                .map(({ diff, line }) => this.getImportSpacingFix(line.node, diff, fixer)),
        });
    }
    getImportSpacingFix(node, diff, fixer) {
        const sourceCode = this.sourceCode;
        const fromKeyword = this.getFromKeyword(node);
        const previousToken = sourceCode.getTokenBefore(fromKeyword);
        if (diff < 0) {
            const index = sourceCode.getIndexFromLoc(previousToken.loc.end);
            return fixer.removeRange([index, index + Math.abs(diff)]);
        }
        return fixer.insertTextAfter(previousToken, ' '.repeat(diff));
    }
    isSuitableImport(node) {
        return node.type === 'ImportDeclaration' && node.specifiers.length >= 1 && isSingleLine(node);
    }
    findSurroundingImports(node) {
        const self = this;
        return [
            ...findImport(node, -1),
            node,
            ...findImport(node, +1),
        ];
        function findImport(importNode, direction) {
            const parentBody = importNode.parent.body;
            const nodeLocation = parentBody.indexOf(importNode);
            const currentLine = importNode.loc.start.line;
            const neighbouringNode = parentBody[nodeLocation + direction];
            if (neighbouringNode && self.isSuitableImport(neighbouringNode) && neighbouringNode.loc.start.line === currentLine + direction) {
                const neighbours = findImport(neighbouringNode, direction);
                return direction < 0 ? [...neighbours, neighbouringNode] : [neighbouringNode, ...neighbours];
            }
            return [];
        }
    }
    getLineInfo(node) {
        const sourceCode = this.sourceCode;
        const fromToken = this.getFromKeyword(node);
        const prevToken = sourceCode.getTokenBefore(fromToken);
        return { node, prevTokenEnd: prevToken.loc.end.column, fromTokenStart: fromToken.loc.start.column };
    }
    shouldReportGroupedDiff(lineDiffs, shouldCollapse) {
        const negativeDiffs = lineDiffs.filter(({ diff }) => diff < 0);
        const positiveDiffs = lineDiffs.filter(({ diff }) => diff > 0);
        return shouldCollapse && negativeDiffs.length === 1 && positiveDiffs.length > 0;
    }
    getAlignmentInfo(currentLine, lines) {
        if (!this.shouldCollapseExtraSpaces(lines)) {
            return {
                alignmentColumn: this.applyMinColumnWidth(Math.max(0, ...lines.map(line => line.fromTokenStart))),
                groupLines: lines,
            };
        }
        const widestResult = this.resolveCollapsedGroup(currentLine, lines, 'widest');
        const shortestResult = this.resolveCollapsedGroup(currentLine, lines, 'shortest');
        return shortestResult.groupLines.length > widestResult.groupLines.length ? shortestResult : widestResult;
    }
    applyMinColumnWidth(alignmentColumn) {
        return this.options.minColumnWidth ? Math.max(alignmentColumn, this.options.minColumnWidth) : alignmentColumn;
    }
    shouldCollapseExtraSpaces(lines) {
        if (this.options.collapseExtraSpaces) {
            return true;
        }
        return this.hasExplicitCollapseExtraSpaces ? false : new Set(lines.map(line => line.prevTokenEnd)).size === 1;
    }
    resolveCollapsedGroup(currentLine, lines, strategy) {
        let candidateLines = lines;
        while (candidateLines.includes(currentLine)) {
            const minPrevTokenEnd = Math.min(...candidateLines.map(line => line.prevTokenEnd));
            const maxPrevTokenEnd = Math.max(...candidateLines.map(line => line.prevTokenEnd));
            const alignmentColumn = this.applyMinColumnWidth(1 + maxPrevTokenEnd);
            if (alignmentColumn - minPrevTokenEnd <= this.options.maxSpaces) {
                return { alignmentColumn, groupLines: candidateLines };
            }
            const nextLines = strategy === 'widest'
                ? candidateLines.filter(line => line.prevTokenEnd < maxPrevTokenEnd)
                : candidateLines.filter(line => line.prevTokenEnd > minPrevTokenEnd);
            if (_.isEmpty(nextLines)) {
                return { alignmentColumn, groupLines: candidateLines };
            }
            if (nextLines.includes(currentLine)) {
                candidateLines = nextLines;
                continue;
            }
            return this.resolveCollapsedGroup(currentLine, candidateLines.filter(line => !nextLines.includes(line)), strategy);
        }
        return {
            alignmentColumn: this.applyMinColumnWidth(Math.max(0, ...lines.map(line => line.fromTokenStart))),
            groupLines: lines,
        };
    }
}
function getImportPrefix(sourceCode, node) {
    const openingBrace = sourceCode.getFirstToken(node, token => token.value === '{');
    if (!openingBrace) {
        return null;
    }
    const importToken = sourceCode.getFirstToken(node);
    return sourceCode.text.slice(importToken.range[0], openingBrace.range[0]);
}
function getNamedSpecifierTexts(sourceCode, node) {
    return node.specifiers
        .filter((specifier) => specifier.type === 'ImportSpecifier')
        .map(specifier => sourceCode.getText(specifier));
}
function buildSingleLineImportText(sourceCode, node) {
    const prefix = getImportPrefix(sourceCode, node);
    const specifiers = getNamedSpecifierTexts(sourceCode, node);
    return `${prefix}{ ${specifiers.join(', ')} } from ${sourceCode.getText(node.source)}`;
}
function getCollapsedLineLength(sourceCode, node) {
    const tokenAfter = sourceCode.getTokenAfter(node);
    const semicolon = tokenAfter && tokenAfter.value === ';' ? ';' : '';
    return getLineIndent(node, sourceCode).length
        + buildSingleLineImportText(sourceCode, node).length
        + semicolon.length;
}
function hasImportSemicolon(sourceCode, node) {
    if (sourceCode.getText(node).trimEnd().endsWith(';')) {
        return true;
    }
    const tokenAfter = sourceCode.getTokenAfter(node);
    return Boolean(tokenAfter && tokenAfter.value === ';');
}
function replaceImportText(fixer, sourceCode, node, text) {
    const finalText = `${text};`;
    const tokenAfter = sourceCode.getTokenAfter(node);
    if (tokenAfter && tokenAfter.value === ';') {
        return fixer.replaceTextRange([node.range[0], tokenAfter.range[1]], finalText);
    }
    return fixer.replaceText(node, finalText);
}
function collapseImportLayout(text) {
    return text
        .replace(/;\s*$/, '')
        .split('\n')
        .map(line => line.trim())
        .join('\n');
}
function hasCanonicalMultilineImportIndent(sourceCode, node, current) {
    if (isSingleLine(node)) {
        return true;
    }
    const baseIndent = getLineIndent(node, sourceCode);
    const childIndent = getChildIndent(baseIndent);
    const lines = current.replace(/;\s*$/, '').split('\n');
    if (lines.length < 3) {
        return true;
    }
    if (!lines[lines.length - 1].startsWith(baseIndent)) {
        return false;
    }
    for (let lineNumber = 1; lineNumber < lines.length - 1; lineNumber++) {
        if (!lines[lineNumber].startsWith(childIndent)) {
            return false;
        }
    }
    return true;
}
function packSpecifierLines(specifiers, maxLen, baseIndent) {
    const continuationIndent = getChildIndent(baseIndent);
    const lines = [];
    let lineStart = continuationIndent;
    let bucket = [];
    function renderLine(start, specs, trailingComma) {
        if (specs.length === 0) {
            return start.trimEnd();
        }
        const text = `${start}${specs.join(', ')}`;
        return trailingComma ? `${text},` : text;
    }
    function remainingFitsOnLine(start, fromIndex) {
        return renderLine(start, specifiers.slice(fromIndex), false).length <= maxLen;
    }
    for (let index = 0; index < specifiers.length; index++) {
        const nextBucket = [...bucket, specifiers[index]];
        const flushWithComma = !remainingFitsOnLine(lineStart, index);
        const candidate = renderLine(lineStart, nextBucket, flushWithComma);
        if (candidate.length <= maxLen) {
            bucket = nextBucket;
            continue;
        }
        if (bucket.length > 0) {
            lines.push(renderLine(lineStart, bucket, true));
            lineStart = continuationIndent;
            bucket = [];
        }
        const alone = `${lineStart}${specifiers[index]}`;
        const aloneCandidate = index < specifiers.length - 1 ? `${alone},` : alone;
        if (aloneCandidate.length <= maxLen) {
            bucket = [specifiers[index]];
            continue;
        }
        lines.push(aloneCandidate);
        lineStart = continuationIndent;
        bucket = [];
    }
    if (bucket.length > 0) {
        lines.push(renderLine(lineStart, bucket, false));
    }
    return lines;
}
function buildWrappedImportText(sourceCode, node, maxLen) {
    const baseIndent = getLineIndent(node, sourceCode);
    const prefix = getImportPrefix(sourceCode, node);
    const specifiers = getNamedSpecifierTexts(sourceCode, node);
    const fromClause = `} from ${sourceCode.getText(node.source)}`;
    const specifierLines = packSpecifierLines(specifiers, maxLen, baseIndent);
    if (specifierLines.length === 0) {
        return `${prefix}{ } from ${sourceCode.getText(node.source)}`;
    }
    return [
        `${prefix}{`,
        ...specifierLines,
        `${baseIndent}${fromClause}`,
    ].join('\n');
}
