import DiffMatchPatch from 'diff-match-patch';
import type { DiffResult, DiffSegment } from './types';
import type { Resolution } from '$lib/components/Paper/Editor/Resolution';
import { migrateResolution, serialize } from '$lib/components/Paper/Editor/Resolution';

/**
 * Extract plain text from a TipTap JSON node recursively
 */
function extractNodeText(node: any): string {
	if (!node) return '';

	if (node.type === 'text') {
		return node.text || '';
	}

	if (node.content && Array.isArray(node.content)) {
		return node.content.map(extractNodeText).join('');
	}

	return '';
}

/**
 * Check if content is a Resolution (vs TipTap JSON)
 */
function isResolutionContent(content: any): content is Resolution {
	return (
		content &&
		typeof content.committeeName === 'string' &&
		Array.isArray(content.preamble) &&
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
export function extractTextFromTipTapJson(content: any): string {
	if (!content) return '';

	// Check if it's a Resolution
	if (isResolutionContent(content)) {
		return serializeResolutionToText(content);
	}

	// Fall back to TipTap extraction
	if (!content.content) return '';

	return content.content
		.map((node: any) => {
			// Handle different block types
			if (node.type === 'paragraph' || node.type === 'heading') {
				return extractNodeText(node);
			}
			if (node.type === 'bulletList') {
				return node.content
					?.map((item: any) => {
						const itemText = extractNodeText(item);
						return `• ${itemText}`;
					})
					.join('\n');
			}
			if (node.type === 'orderedList') {
				return node.content
					?.map((item: any, index: number) => {
						const itemText = extractNodeText(item);
						return `${index + 1}. ${itemText}`;
					})
					.join('\n');
			}
			return extractNodeText(node);
		})
		.filter((text: string) => text.length > 0)
		.join('\n\n');
}

/**
 * Compute diff between two TipTap JSON documents
 * Returns segments for both "before" and "after" panels
 */
export function computeDiff(beforeContent: any, afterContent: any): DiffResult {
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
export function areContentsEqual(content1: any, content2: any): boolean {
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
export function computeDiffStats(beforeContent: any, afterContent: any): DiffStats {
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
