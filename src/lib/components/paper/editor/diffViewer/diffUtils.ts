import DiffMatchPatch from 'diff-match-patch';
import type { DiffResult, DiffSegment } from './types';
import type { Resolution } from '$lib/components/paper/editor/resolution';
import { migrateResolution, serialize } from '$lib/components/paper/editor/resolution';

/** The `type` of a TipTap JSON node, if the value is one. */
function nodeType(node: unknown): unknown {
	return typeof node === 'object' && node !== null && 'type' in node ? node.type : undefined;
}

/** The child nodes of a TipTap JSON node, if it has any. */
function nodeChildren(node: unknown): unknown[] | undefined {
	return typeof node === 'object' &&
		node !== null &&
		'content' in node &&
		Array.isArray(node.content)
		? node.content
		: undefined;
}

/**
 * Extract plain text from a TipTap JSON node recursively
 */
function extractNodeText(node: unknown): string {
	if (!node || typeof node !== 'object') return '';

	if (nodeType(node) === 'text') {
		return 'text' in node && node.text ? String(node.text) : '';
	}

	const children = nodeChildren(node);
	if (children) {
		return children.map(extractNodeText).join('');
	}

	return '';
}

/**
 * Check if content is a Resolution (vs TipTap JSON)
 */
function isResolutionContent(content: unknown): content is Resolution {
	return (
		typeof content === 'object' &&
		content !== null &&
		'committeeName' in content &&
		typeof content.committeeName === 'string' &&
		'preamble' in content &&
		Array.isArray(content.preamble) &&
		'operative' in content &&
		Array.isArray(content.operative)
	);
}

/**
 * Serialize a Resolution to canonical RES-Markup text for diff comparison.
 *
 * Uses the resolution-editor package's `serialize()` (the RES-Markup exchange
 * language) so the diff reflects the resolution's real structure with stable,
 * marker-driven output. The leading `%RES 1.0` version line and the
 * `Key: Value` front-matter block are dropped — the diff starts at the first
 * `== … ==` section so version/metadata churn doesn't pollute the diff.
 */
function serializeResolutionToText(rawResolution: Resolution): string {
	// Migrate legacy format if needed, then serialize to canonical RES-Markup.
	const resolution = migrateResolution(rawResolution) as Resolution;
	const markup = serialize(resolution);

	// Drop everything before the first section marker (`%RES 1.0` + front-matter).
	const lines = markup.split('\n');
	const firstSection = lines.findIndex((line) => /^== .* ==$/.test(line));
	const body = firstSection === -1 ? markup : lines.slice(firstSection).join('\n');

	// Only strip a trailing newline — RES-Markup relies on internal blank lines.
	return body.replace(/\n+$/, '');
}

/**
 * Extract plain text from TipTap JSON content
 * Preserves paragraph structure with double newlines
 * Also handles Resolution content with labeled clauses
 */
export function extractTextFromTipTapJson(content: unknown): string {
	if (!content) return '';

	// Check if it's a Resolution
	if (isResolutionContent(content)) {
		return serializeResolutionToText(content);
	}

	// Fall back to TipTap extraction
	const blocks = nodeChildren(content);
	if (!blocks) return '';

	return blocks
		.map((node) => {
			const type = nodeType(node);
			// Handle different block types
			if (type === 'paragraph' || type === 'heading') {
				return extractNodeText(node);
			}
			if (type === 'bulletList') {
				return nodeChildren(node)
					?.map((item) => {
						const itemText = extractNodeText(item);
						return `• ${itemText}`;
					})
					.join('\n');
			}
			if (type === 'orderedList') {
				return nodeChildren(node)
					?.map((item, index) => {
						const itemText = extractNodeText(item);
						return `${index + 1}. ${itemText}`;
					})
					.join('\n');
			}
			return extractNodeText(node);
		})
		.filter((text) => text !== undefined && text.length > 0)
		.join('\n\n');
}

/**
 * Compute diff between two TipTap JSON documents
 * Returns segments for both "before" and "after" panels
 */
export function computeDiff(beforeContent: unknown, afterContent: unknown): DiffResult {
	const dmp = new DiffMatchPatch();

	const beforeText = extractTextFromTipTapJson(beforeContent);
	const afterText = extractTextFromTipTapJson(afterContent);

	// Compute the diff
	const diffs = dmp.diff_main(beforeText, afterText);
	// Clean up the diff to be more human-readable
	dmp.diff_cleanupSemantic(diffs);

	// Convert to before/after segments
	const beforeSegments: DiffSegment[] = [];
	const afterSegments: DiffSegment[] = [];

	for (const [operation, text] of diffs) {
		if (operation === 0) {
			// Equal - appears in both
			beforeSegments.push({ text, type: 'equal' });
			afterSegments.push({ text, type: 'equal' });
		} else if (operation === -1) {
			// Delete - only in before
			beforeSegments.push({ text, type: 'delete' });
		} else if (operation === 1) {
			// Insert - only in after
			afterSegments.push({ text, type: 'insert' });
		}
	}

	return { beforeSegments, afterSegments };
}

/**
 * Check if two contents are identical
 */
export function areContentsEqual(content1: unknown, content2: unknown): boolean {
	const text1 = extractTextFromTipTapJson(content1);
	const text2 = extractTextFromTipTapJson(content2);
	return text1 === text2;
}

export interface DiffStats {
	added: number;
	removed: number;
}

/**
 * Compute character change statistics between two TipTap JSON documents
 * Returns the number of characters added and removed
 */
export function computeDiffStats(beforeContent: unknown, afterContent: unknown): DiffStats {
	const dmp = new DiffMatchPatch();

	const beforeText = extractTextFromTipTapJson(beforeContent);
	const afterText = extractTextFromTipTapJson(afterContent);

	const diffs = dmp.diff_main(beforeText, afterText);
	// Apply semantic cleanup to match the visual diff produced by computeDiff
	dmp.diff_cleanupSemantic(diffs);

	let added = 0;
	let removed = 0;

	for (const [operation, text] of diffs) {
		if (operation === 1) {
			added += text.length;
		} else if (operation === -1) {
			removed += text.length;
		}
	}

	return { added, removed };
}

/** One rendered line of a diff panel, with the kind of change it carries. */
interface DiffLine {
	parts: DiffSegment[];
	hasChange: boolean;
	changeType: 'none' | 'insert' | 'delete' | 'mixed';
}

const emptyLine = (): DiffLine => ({ parts: [], hasChange: false, changeType: 'none' });

/** Appends one piece of text to a line and folds its change into the line's change type. */
function addPart(line: DiffLine, text: string, type: DiffSegment['type']) {
	line.parts.push({ text, type });
	if (type === 'equal') return;
	line.hasChange = true;
	if (line.changeType === 'none') line.changeType = type;
	else if (line.changeType !== type) line.changeType = 'mixed';
}

/**
 * Splits diff segments at their newlines into lines. An empty piece between two newlines still
 * ends a line but adds no part, except at the start of a segment, where it is kept.
 */
export function splitIntoDiffLines(segments: DiffSegment[]): DiffLine[] {
	const result: DiffLine[] = [];
	let currentLine = emptyLine();

	for (const segment of segments) {
		const textParts = segment.text.split('\n');
		textParts.forEach((text, i) => {
			if (text.length > 0 || i === 0) addPart(currentLine, text, segment.type);
			// Every part but the last ends at a newline
			if (i < textParts.length - 1) {
				result.push(currentLine);
				currentLine = emptyLine();
			}
		});
	}

	if (currentLine.parts.length > 0) result.push(currentLine);
	return result;
}
