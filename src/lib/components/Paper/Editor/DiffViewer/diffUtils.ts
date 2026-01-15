import DiffMatchPatch from 'diff-match-patch';
import type { DiffResult, DiffSegment } from './types';
import type { Resolution, SubClause, OperativeClause, ClauseBlock } from '$lib/schemata/resolution';
import { toRoman, toLetter, migrateResolution } from '$lib/schemata/resolution';

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
 * Get label for sub-clause based on depth
 * Depth 1: I, II, III (Roman numerals)
 * Depth 2: a, b, c
 * Depth 3: aa, bb, cc
 * Depth 4: aaa, bbb, ccc
 */
function getDepthLabel(index: number, depth: number): string {
	const num = index + 1;
	switch (depth) {
		case 1:
			return toRoman(num);
		case 2:
			return toLetter(num);
		case 3:
			return toLetter(num).repeat(2);
		case 4:
			return toLetter(num).repeat(3);
		default:
			return String(num);
	}
}

/**
 * Get all text content from blocks (concatenated)
 */
function getBlocksTextContent(blocks: ClauseBlock[]): string {
	return blocks
		.filter((block): block is { type: 'text'; id: string; content: string } => block.type === 'text')
		.map((block) => block.content.trim())
		.filter((content) => content.length > 0)
		.join(' ');
}

/**
 * Serialize sub-clauses recursively with labels (block-based structure)
 */
function serializeSubClauses(
	subClauses: SubClause[],
	parentLabel: string,
	depth: number,
	lines: string[]
): void {
	subClauses.forEach((sub, index) => {
		const depthLabel = getDepthLabel(index, depth);

		// Get text content from blocks
		const textContent = getBlocksTextContent(sub.blocks);
		if (textContent) {
			lines.push(`[${parentLabel}.${depthLabel}]`);
			lines.push(textContent);
			lines.push('');
		}

		// Process nested subclauses blocks
		for (const block of sub.blocks) {
			if (block.type === 'subclauses' && block.items.length > 0) {
				serializeSubClauses(block.items, `${parentLabel}.${depthLabel}`, depth + 1, lines);
			}
		}
	});
}

/**
 * Serialize a Resolution to labeled plain text for diff comparison
 * Format: [P 1], [P 2], [O 1], [O 1.I], [O 1.I.a], etc.
 */
function serializeResolutionToText(rawResolution: Resolution): string {
	// Migrate legacy format if needed
	const resolution = migrateResolution(rawResolution) as Resolution;

	const lines: string[] = [];

	// Preamble clauses
	resolution.preamble.forEach((clause, index) => {
		if (clause.content.trim()) {
			lines.push(`[P ${index + 1}]`);
			lines.push(clause.content.trim());
			lines.push('');
		}
	});

	// Operative clauses (block-based)
	resolution.operative.forEach((clause, opIndex) => {
		// Get text content from blocks
		const textContent = getBlocksTextContent(clause.blocks);
		if (textContent) {
			lines.push(`[O ${opIndex + 1}]`);
			lines.push(textContent);
			lines.push('');
		}

		// Process subclauses blocks
		for (const block of clause.blocks) {
			if (block.type === 'subclauses' && block.items.length > 0) {
				serializeSubClauses(block.items, `O ${opIndex + 1}`, 1, lines);
			}
		}
	});

	return lines.join('\n').trim();
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
