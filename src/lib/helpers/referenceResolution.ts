import Fuse from 'fuse.js';
import { diff_match_patch } from 'diff-match-patch';

export interface ReferenceData {
	blockId: string;
	originalText: string;
	previewText: string;
	createdAt: string;
	paperVersion: number;
}

export interface ReferenceState {
	isOutdated: boolean;
	isOrphaned: boolean;
	currentText: string | null;
	similarityScore: number;
}

interface TextBlock {
	id: string;
	text: string;
}

/**
 * Extracts all text blocks with their IDs from TipTap JSON content
 */
function extractTextBlocks(content: unknown): TextBlock[] {
	const blocks: TextBlock[] = [];

	function traverse(node: unknown): void {
		if (!node || typeof node !== 'object') return;

		const nodeObj = node as Record<string, unknown>;

		// Check if this node has a block ID and content
		const blockId = nodeObj['attrs']
			? (nodeObj['attrs'] as Record<string, unknown>)['data-block-id']
			: null;

		if (typeof blockId === 'string' && blockId) {
			const text = extractTextFromNode(nodeObj);
			if (text) {
				blocks.push({ id: blockId, text });
			}
		}

		// Traverse children
		if (Array.isArray(nodeObj['content'])) {
			for (const child of nodeObj['content']) {
				traverse(child);
			}
		}
	}

	traverse(content);
	return blocks;
}

/**
 * Extracts plain text from a TipTap node
 */
function extractTextFromNode(node: unknown): string {
	if (!node || typeof node !== 'object') return '';

	const nodeObj = node as Record<string, unknown>;

	if (nodeObj['type'] === 'text' && typeof nodeObj['text'] === 'string') {
		return nodeObj['text'];
	}

	if (Array.isArray(nodeObj['content'])) {
		return nodeObj['content'].map((child) => extractTextFromNode(child)).join('');
	}

	return '';
}

/**
 * Resolves a reference by block ID (primary lookup)
 */
export function resolveReferenceByBlockId(
	content: unknown,
	blockId: string
): { text: string; found: boolean } {
	const blocks = extractTextBlocks(content);
	const block = blocks.find((b) => b.id === blockId);

	if (block) {
		return { text: block.text, found: true };
	}

	return { text: '', found: false };
}

/**
 * Resolves a reference by fuzzy text matching (fallback)
 */
export function resolveReferenceByFuzzyMatch(
	content: unknown,
	originalText: string
): { blockId: string | null; text: string; score: number } {
	const blocks = extractTextBlocks(content);

	if (blocks.length === 0) {
		return { blockId: null, text: '', score: 0 };
	}

	const fuse = new Fuse(blocks, {
		keys: ['text'],
		includeScore: true,
		threshold: 0.6, // Allow fairly different matches
		ignoreLocation: true
	});

	const results = fuse.search(originalText);

	if (results.length > 0 && results[0].score !== undefined) {
		const bestMatch = results[0];
		// Fuse score is 0 = perfect match, 1 = no match, so invert it
		const similarityScore = 1 - (bestMatch.score ?? 1);
		return {
			blockId: bestMatch.item.id,
			text: bestMatch.item.text,
			score: similarityScore
		};
	}

	return { blockId: null, text: '', score: 0 };
}

/**
 * Calculates text similarity using diff-match-patch (Levenshtein-based)
 */
export function calculateSimilarity(text1: string, text2: string): number {
	if (!text1 && !text2) return 1;
	if (!text1 || !text2) return 0;

	const dmp = new diff_match_patch();
	const diffs = dmp.diff_main(text1, text2);
	const levenshtein = dmp.diff_levenshtein(diffs);
	const maxLength = Math.max(text1.length, text2.length);

	if (maxLength === 0) return 1;

	return 1 - levenshtein / maxLength;
}

/**
 * Checks the current status of a reference against paper content
 */
export function checkReferenceStatus(reference: ReferenceData, content: unknown): ReferenceState {
	// First try to find by block ID
	const byId = resolveReferenceByBlockId(content, reference.blockId);

	if (byId.found) {
		// Block exists, check if text has changed significantly
		const similarityScore = calculateSimilarity(reference.originalText, byId.text);
		const isOutdated = similarityScore < 0.9; // Less than 90% similar = outdated

		return {
			isOutdated,
			isOrphaned: false,
			currentText: byId.text,
			similarityScore
		};
	}

	// Block ID not found, try fuzzy match
	const byFuzzy = resolveReferenceByFuzzyMatch(content, reference.originalText);

	if (byFuzzy.blockId && byFuzzy.score > 0.5) {
		// Found similar text in a different block
		return {
			isOutdated: true,
			isOrphaned: false,
			currentText: byFuzzy.text,
			similarityScore: byFuzzy.score
		};
	}

	// Content truly orphaned - not found anywhere
	return {
		isOutdated: false,
		isOrphaned: true,
		currentText: null,
		similarityScore: 0
	};
}

/**
 * Finds the block ID for a given position in the editor content
 * Used when creating a new reference from a selection
 */
export function findBlockIdAtPosition(
	content: unknown,
	searchText: string
): { blockId: string; fullText: string } | null {
	const blocks = extractTextBlocks(content);

	// Find the block that contains the selected text
	for (const block of blocks) {
		if (block.text.includes(searchText)) {
			return { blockId: block.id, fullText: block.text };
		}
	}

	return null;
}
