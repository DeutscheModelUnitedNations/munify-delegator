import DiffMatchPatch from 'diff-match-patch';
import type { DiffResult, DiffSegment } from './types';

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
 * Extract plain text from TipTap JSON content
 * Preserves paragraph structure with double newlines
 */
export function extractTextFromTipTapJson(content: any): string {
	if (!content || !content.content) return '';

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
