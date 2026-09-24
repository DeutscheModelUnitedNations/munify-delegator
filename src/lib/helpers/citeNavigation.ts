/**
 * Service for finding and highlighting quoted text in papers
 */

export interface FindCiteResult {
	found: boolean;
	matchCount: number;
}

/**
 * Finds all occurrences of the quoted text in the paper container,
 * highlights them, and scrolls to the first match
 */
export function findAndHighlightCite(
	searchText: string,
	paperContainer: HTMLElement | null
): FindCiteResult {
	if (!paperContainer || !searchText.trim()) {
		return { found: false, matchCount: 0 };
	}

	// Clean up any existing highlights first
	clearCiteHighlights(paperContainer);

	// Normalize search text (collapse whitespace)
	const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();

	if (!normalizedSearch) {
		return { found: false, matchCount: 0 };
	}

	// Find all matches and wrap them in highlight spans
	const highlightSpans = findAndWrapMatches(paperContainer, normalizedSearch);

	if (highlightSpans.length === 0) {
		return { found: false, matchCount: 0 };
	}

	// Scroll to the first match
	highlightSpans[0].scrollIntoView({
		behavior: 'smooth',
		block: 'center'
	});

	// Schedule cleanup after animation
	setTimeout(() => {
		clearCiteHighlights(paperContainer);
	}, 2000);

	return { found: true, matchCount: highlightSpans.length };
}

/**
 * Removes all cite highlight spans from the container
 */
function clearCiteHighlights(container: HTMLElement): void {
	const highlights = container.querySelectorAll('.cite-highlight');
	for (const span of highlights) {
		const parent = span.parentNode;
		if (parent) {
			// Move children out of the span
			while (span.firstChild) {
				parent.insertBefore(span.firstChild, span);
			}
			parent.removeChild(span);
			parent.normalize();
		}
	}
}

/**
 * Finds all occurrences of searchText in the container and wraps them in highlight spans
 */
function findAndWrapMatches(container: HTMLElement, searchText: string): HTMLElement[] {
	const highlightSpans: HTMLElement[] = [];

	// Get all text-containing elements
	const blockSelectors = [
		'p',
		'li',
		'h1',
		'h2',
		'h3',
		'h4',
		'div[data-type="preamble-clause"]',
		'div[data-type="operative-clause"]',
		'div[data-type="sub-clause"]'
	];

	const blocks = container.querySelectorAll(blockSelectors.join(', '));

	for (const block of blocks) {
		const blockText = block.textContent || '';
		const normalizedBlockText = blockText.replace(/\s+/g, ' ');

		// Check if this block contains the search text
		if (!normalizedBlockText.includes(searchText)) {
			continue;
		}

		// Find and highlight the text within this block
		const spans = highlightTextInBlock(block as HTMLElement, searchText);
		highlightSpans.push(...spans);
	}

	return highlightSpans;
}

/**
 * Highlights all occurrences of searchText within a single block element
 */
function highlightTextInBlock(block: HTMLElement, searchText: string): HTMLElement[] {
	const highlightSpans: HTMLElement[] = [];

	// Build list of text nodes
	const textNodes: Text[] = [];
	const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
	let node: Node | null;
	while ((node = walker.nextNode())) {
		textNodes.push(node as Text);
	}

	// Build combined text with position mapping
	let combinedText = '';
	const nodeMap: { node: Text; start: number; end: number }[] = [];

	for (const textNode of textNodes) {
		const nodeText = textNode.textContent || '';
		const normalizedNodeText = nodeText.replace(/\s+/g, ' ');
		nodeMap.push({
			node: textNode,
			start: combinedText.length,
			end: combinedText.length + normalizedNodeText.length
		});
		combinedText += normalizedNodeText;
	}

	// Find all occurrences of search text
	let searchIndex = 0;
	while ((searchIndex = combinedText.indexOf(searchText, searchIndex)) !== -1) {
		const searchEnd = searchIndex + searchText.length;

		// Find which text nodes this match spans
		for (const { node, start, end } of nodeMap) {
			// Check if this node overlaps with our match
			if (end <= searchIndex || start >= searchEnd) {
				continue;
			}

			// Calculate overlap within this node
			const overlapStart = Math.max(0, searchIndex - start);
			const overlapEnd = Math.min(end - start, searchEnd - start);

			// Map normalized positions back to original text positions
			const originalText = node.textContent || '';
			const positions = mapNormalizedToOriginal(originalText, overlapStart, overlapEnd);

			if (positions.start >= positions.end) {
				continue;
			}

			try {
				const range = document.createRange();
				range.setStart(node, positions.start);
				range.setEnd(node, positions.end);

				const span = document.createElement('span');
				span.className = 'cite-highlight';
				range.surroundContents(span);
				highlightSpans.push(span);
			} catch {
				// surroundContents can fail if range spans element boundaries
				continue;
			}
		}

		searchIndex = searchEnd;
	}

	return highlightSpans;
}

/**
 * Maps positions in normalized text (whitespace collapsed) back to original text
 */
function mapNormalizedToOriginal(
	originalText: string,
	normalizedStart: number,
	normalizedEnd: number
): { start: number; end: number } {
	let originalPos = 0;
	let normalizedPos = 0;
	let resultStart = 0;
	let resultEnd = originalText.length;

	while (originalPos < originalText.length && normalizedPos <= normalizedEnd) {
		if (normalizedPos === normalizedStart) {
			resultStart = originalPos;
		}

		const char = originalText[originalPos];
		if (/\s/.test(char)) {
			// Skip consecutive whitespace (counts as 1 in normalized)
			while (originalPos < originalText.length - 1 && /\s/.test(originalText[originalPos + 1])) {
				originalPos++;
			}
		}

		originalPos++;
		normalizedPos++;

		if (normalizedPos === normalizedEnd) {
			resultEnd = originalPos;
			break;
		}
	}

	return { start: resultStart, end: resultEnd };
}
