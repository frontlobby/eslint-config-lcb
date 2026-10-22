import { BaseESLintRule } from "../BaseESLintRule.mjs";
import { countBlankLines, getChildIndent, getLineIndent, isSingleLine } from "../utils.mjs";
const defaultMaxLen = 130;
const messageAlign = 'Interface fields should be aligned on their colons';
const messageBlankLine = 'Unexpected blank line between interface fields';
const messageComment = 'Interface field comments should be JSDoc comments above the field';
const messageExpand = 'Inline object types should be split over multiple lines';
// Index signatures align on the colon after `]`, not the one inside the brackets
const fieldTypes = new Set(['TSPropertySignature', 'TSIndexSignature']);
// Class fields keep `name: type` spacing; only an inline object type they declare is laid out
const classFieldTypes = new Set(['PropertyDefinition', 'TSAbstractPropertyDefinition']);
const directiveComment = /^\s*(?:eslint\b|eslint-|global\b|globals\b|exported\b|@ts-|#region\b|#endregion\b|prettier-ignore\b|istanbul\b|c8\b|\/)/;
/**
 * Lay out TypeScript interface declarations, and the inline object types of their fields and of class fields.
 *
 * - No blank lines between members.
 * - Field colons aligned in one column with at least one space before them, so the types line up too.
 * - An inline object type used as a field's type, directly or as an array (`{ ... }[]`), is split over multiple
 *   lines, one member per line. This also applies to class fields, whose own `name: type` spacing is unchanged.
 * - A field's comments, whether line, block or JSDoc comments on the lines above it or one trailing on its last
 *   line, become one JSDoc block directly above the field, so editors show them on hover. Each comment line is one
 *   JSDoc line. A single line keeps the block on one line when that fits within `maxLen`; otherwise, and for
 *   several lines, the block uses the multi-line form.
 *
 * Single-line interfaces are left alone. Directive comments (`eslint-disable`, `@ts-expect-error`,
 * `#region`, ...) are never converted or moved, nor is any other comment on the same field. Comments that belong
 * to no field, such as one before the closing brace, are left alone too.
 */
export class InterfaceLayout extends BaseESLintRule {
    static meta = {
        type: 'layout',
        docs: {
            description: 'Align interface fields, keep them compact, expand inline object types and turn field comments into JSDoc',
            category: 'Stylistic Issues',
            recommended: false,
        },
        fixable: 'whitespace',
        schema: [
            {
                type: 'object',
                properties: {
                    maxLen: {
                        type: 'integer',
                        minimum: 1,
                    },
                },
                additionalProperties: false,
            },
        ],
    };
    options;
    constructor(context) {
        super(context);
        this.options = Object.assign({ maxLen: defaultMaxLen }, context.options[0]);
    }
    static create(context) {
        const rule = new InterfaceLayout(context);
        return {
            TSInterfaceBody(node) {
                rule.checkInterfaceBody(node);
            },
            TSTypeLiteral(node) {
                rule.checkTypeLiteral(node);
            },
        };
    }
    checkInterfaceBody(node) {
        if (isLaidOutBody(node)) {
            this.checkBody(node);
        }
    }
    checkTypeLiteral(node) {
        if (!isLaidOutBody(node)) {
            return;
        }
        if (needsExpansion(node, this.sourceCode)) {
            this.context.report({
                node: node,
                message: messageExpand,
                fix: fixer => fixer.replaceText(node, this.getExpandedText(node)),
            });
            return;
        }
        this.checkBody(node);
    }
    checkBody(node) {
        const members = getMembers(node);
        const items = this.getBodyItems(node, members);
        this.checkBlankLines(items);
        this.checkAlignment(members);
        members.forEach(member => this.checkMemberComments(member, items));
    }
    /** Members plus the comments between them, in source order. */
    getBodyItems(node, members) {
        const comments = this.sourceCode.getCommentsInside(node)
            .filter(comment => !members.some(member => member.range[0] <= comment.range[0] && comment.range[1] <= member.range[1]));
        return [...members, ...comments].sort((a, b) => a.range[0] - b.range[0]);
    }
    checkBlankLines(items) {
        for (let i = 1; i < items.length; i++) {
            const range = [items[i - 1].range[1], items[i].range[0]];
            const gap = this.sourceCode.text.slice(...range);
            if (countBlankLines(gap) === 0) {
                continue;
            }
            this.context.report({
                loc: items[i].loc,
                message: messageBlankLine,
                fix: fixer => fixer.replaceTextRange(range, `\n${gap.slice(gap.lastIndexOf('\n') + 1)}`),
            });
        }
    }
    checkAlignment(members) {
        // The fix rewrites both sides of the colon, so a field with anything but spaces or tabs there, such as a comment, is left
        // as written. Filtering it here rather than in getAlignedField keeps isAlignedMember true, so type-annotation-spacing
        // leaves it alone too.
        const fields = members.map(member => getAlignedField(member, this.sourceCode)).filter((field) => Boolean(field))
            .filter(field => /^[ \t]*:[ \t]*$/.test(this.sourceCode.text.slice(field.tokenBeforeColon.range[1], field.typeStart)));
        if (fields.length === 0) {
            return;
        }
        const colonColumn = Math.max(...fields.map(field => field.tokenBeforeColon.loc.end.column)) + 1;
        for (const field of fields) {
            const padding = ' '.repeat(colonColumn - field.tokenBeforeColon.loc.end.column);
            const beforeRange = [field.tokenBeforeColon.range[1], field.colon.range[0]];
            const afterRange = [field.colon.range[1], field.typeStart];
            if (this.sourceCode.text.slice(...beforeRange) === padding && this.sourceCode.text.slice(...afterRange) === ' ') {
                continue;
            }
            this.context.report({
                node: field.member,
                loc: field.colon.loc,
                message: messageAlign,
                fix: fixer => [
                    fixer.replaceTextRange(beforeRange, padding),
                    fixer.replaceTextRange(afterRange, ' '),
                ],
            });
        }
    }
    checkMemberComments(member, items) {
        const leading = this.getLeadingComments(member, items);
        const trailing = this.getTrailingComment(member);
        const comments = trailing ? [...leading, trailing] : leading;
        const lines = trimBlankLines(comments.flatMap(getCommentLines));
        // A `*/` in the text would end the JSDoc early
        if (lines.length === 0 || comments.some(isDirective) || lines.some(line => line.includes('*/'))) {
            return;
        }
        const indent = getLineIndent(member, this.sourceCode);
        const docLines = this.getDocLines(lines, indent);
        if (!trailing && leading.length === 1 && this.isDocAbove(leading[0], member, docLines.map(line => `${indent}${line}`).join('\n'))) {
            return;
        }
        this.context.report({
            node: member,
            message: messageComment,
            fix: fixer => this.getCommentFix(fixer, member, { leading, trailing }, docLines),
        });
    }
    /** One line of text stays on one line when it fits; anything else uses the multi-line form. */
    getDocLines(lines, indent) {
        const singleLine = `/** ${lines[0]} */`;
        if (lines.length === 1 && indent.length + singleLine.length <= this.options.maxLen) {
            return [singleLine];
        }
        return ['/**', ...lines.map(line => (line ? ` * ${line}` : ' *')), ' */'];
    }
    /** The comment's lines, from the start of its first line, are exactly `docText`, and the member starts below them. */
    isDocAbove(comment, member, docText) {
        const lineStart = comment.range[0] - comment.loc.start.column;
        return comment.loc.end.line < member.loc.start.line && this.sourceCode.text.slice(lineStart, comment.range[1]) === docText;
    }
    getCommentFix(fixer, member, { leading, trailing }, docLines) {
        const indent = getLineIndent(member, this.sourceCode);
        const memberText = this.sourceCode.getText(member);
        const end = trailing ? trailing.range[1] : member.range[1];
        const lastLeading = leading[leading.length - 1];
        if (leading.length === 0) {
            return fixer.replaceTextRange([member.range[0], end], [...docLines, memberText].join(`\n${indent}`));
        }
        const start = this.sourceCode.getTokenBefore(leading[0], { includeComments: true }).range[1];
        // Leaving a field that starts below its comments out of the fix keeps the fix clear of the field's alignment fix
        if (!trailing && lastLeading.loc.end.line < member.loc.start.line) {
            return fixer.replaceTextRange([start, lastLeading.range[1]], docLines.map(line => `\n${indent}${line}`).join(''));
        }
        return fixer.replaceTextRange([start, end], [...docLines, memberText].map(line => `\n${indent}${line}`).join(''));
    }
    /** Comments between the previous member (and its trailing comment) and this one. */
    getLeadingComments(member, items) {
        const comments = [];
        for (let i = items.indexOf(member) - 1; i >= 0; i--) {
            const item = items[i];
            if (!isComment(item) || this.isTrailingComment(item)) {
                break;
            }
            comments.unshift(item);
        }
        return comments;
    }
    getTrailingComment(member) {
        const next = this.sourceCode.getTokenAfter(member, { includeComments: true });
        return next && isComment(next) && next.loc.start.line === member.loc.end.line ? next : null;
    }
    /** A comment that starts on the line a member ends on belongs to that member. */
    isTrailingComment(comment) {
        const before = this.sourceCode.getTokenBefore(comment, { includeComments: true });
        return Boolean(before) && !isComment(before) && before.value !== '{' && before.loc.end.line === comment.loc.start.line;
    }
    getExpandedText(node) {
        const indent = getLineIndent(node, this.sourceCode);
        const lines = this.getBodyItems(node, getMembers(node)).map(item => {
            const text = this.sourceCode.getText(item);
            return isComment(item) ? text : `${text.replace(/[;,]$/, '')};`;
        });
        return `{\n${lines.map(line => `${getChildIndent(indent)}${line}`).join('\n')}\n${indent}}`;
    }
}
/**
 * Whether `interface-layout` owns the spacing before the member's colon: it aligns the colon, or leaves it as written
 * when a comment sits beside it.
 */
export function isAlignedMember(member, sourceCode) {
    return Boolean(member.parent) && isLaidOutBody(member.parent) && Boolean(getAlignedField(member, sourceCode));
}
/**
 * Interface bodies spanning several lines, and inline object types (or arrays of them) used as the type of a
 * class field or of a field inside a laid-out body.
 */
function isLaidOutBody(node) {
    if (node.type === 'TSInterfaceBody') {
        return !isSingleLine(node);
    }
    let annotation = node.parent;
    while (annotation?.type === 'TSArrayType') {
        annotation = annotation.parent;
    }
    const field = annotation?.parent;
    if (node.type !== 'TSTypeLiteral' || annotation?.type !== 'TSTypeAnnotation' || !field) {
        return false;
    }
    return classFieldTypes.has(field.type) || (fieldTypes.has(field.type) && Boolean(field.parent) && isLaidOutBody(field.parent));
}
function getMembers(node) {
    return (node.type === 'TSInterfaceBody' ? node.body : node.members) ?? [];
}
/** A non-empty inline object type is expanded unless `{`, each member and `}` all start their own lines. */
function needsExpansion(node, sourceCode) {
    const members = getMembers(node);
    if (members.length === 0) {
        return false;
    }
    const openBrace = sourceCode.getFirstToken(node);
    const closeBrace = sourceCode.getLastToken(node);
    const first = sourceCode.getTokenAfter(openBrace, { includeComments: true });
    const last = sourceCode.getTokenBefore(closeBrace, { includeComments: true });
    return first.loc.start.line === openBrace.loc.end.line
        || last.loc.end.line === closeBrace.loc.start.line
        || members.some((member, i) => i > 0 && member.loc.start.line === members[i - 1].loc.end.line);
}
function getAlignedField(member, sourceCode) {
    if (!fieldTypes.has(member.type) || !member.typeAnnotation) {
        return null;
    }
    const previous = sourceCode.getTokenBefore(member, { includeComments: true });
    if (previous && previous.loc.end.line === member.loc.start.line) {
        return null;
    }
    const colon = sourceCode.getFirstToken(member.typeAnnotation);
    const tokenBeforeColon = sourceCode.getTokenBefore(colon);
    const typeStart = member.typeAnnotation.typeAnnotation.range[0];
    const typeOnNextLine = sourceCode.text.slice(colon.range[1], typeStart).includes('\n');
    const isOneLine = tokenBeforeColon.loc.end.line === colon.loc.start.line && !typeOnNextLine;
    return colon.value !== ':' || !isOneLine ? null : { colon, member, tokenBeforeColon, typeStart };
}
/** The comment's text, one entry per source line, without its comment markers. */
function getCommentLines(comment) {
    if (comment.type === 'Line') {
        return [comment.value.replace(/^ /, '').trimEnd()];
    }
    return trimBlankLines(comment.value.split('\n').map(line => line.replace(/^\s*\*?\s?/, '').trimEnd()));
}
function trimBlankLines(lines) {
    const first = lines.findIndex(Boolean);
    return first === -1 ? [] : lines.slice(first, lines.findLastIndex(Boolean) + 1);
}
function isDirective(comment) {
    return directiveComment.test(comment.value);
}
function isComment(item) {
    return item.type === 'Line' || item.type === 'Block';
}
