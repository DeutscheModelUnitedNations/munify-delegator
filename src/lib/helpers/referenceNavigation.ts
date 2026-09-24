/**
 * Scrolls to a referenced block and applies a temporary highlight animation
 */
export function scrollToReference(
	blockId: string,
	paperContainer: HTMLElement | null
): { success: boolean } {
	if (!paperContainer) {
		return { success: false };
	}

	// Find the element with the matching block ID
	const targetElement = paperContainer.querySelector(`[data-block-id="${blockId}"]`);

	if (!targetElement) {
		return { success: false };
	}

	// Scroll to the element with smooth behavior
	targetElement.scrollIntoView({
		behavior: 'smooth',
		block: 'center'
	});

	// Apply temporary highlight to whole element (no specific text provided)
	applyHighlightToElement(targetElement as HTMLElement);

	return { success: true };
}

/**
 * Applies a temporary highlight animation to an entire element (~2s fade)
 */
function applyHighlightToElement(element: HTMLElement): void {
	const highlightClass = 'reference-highlight';

	// Add highlight class
	element.classList.add(highlightClass);

	// Remove after animation completes
	setTimeout(() => {
		element.classList.remove(highlightClass);
	}, 2000);
}

/**
 * Finds and highlights specific text within an element
 * Handles text that spans multiple text nodes (common in rich text editors)
 * Returns true if the text was found and highlighted
 */
function highlightTextInElement(element: HTMLElement, searchText: string): boolean {
	// Normalize the search text (collapse whitespace like the browser does)
	const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();

	// Get the full text content and find where our search text is
	const fullText = element.textContent || '';
	const normalizedFull = fullText.replace(/\s+/g, ' ');

	// Find the search text in the normalized full text
	const searchIndex = normalizedFull.indexOf(normalizedSearch);

	if (searchIndex === -1) {
		// Text not found, fall back to highlighting the whole element
		applyHighlightToElement(element);
		return false;
	}

	// Build a map of text nodes with their character positions
	const textNodes: { node: Text; start: number; end: number }[] = [];
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

	let charCount = 0;
	let node: Text | null;
	while ((node = walker.nextNode() as Text | null)) {
		const nodeText = node.textContent || '';
		// Normalize this node's contribution to character count
		// Account for whitespace collapsing between nodes
		const normalizedNodeText = nodeText.replace(/\s+/g, ' ');
		const trimmedLength = normalizedNodeText.length;

		if (trimmedLength > 0) {
			textNodes.push({
				node,
				start: charCount,
				end: charCount + trimmedLength
			});
			charCount += trimmedLength;
		}
	}

	// Find which text nodes contain our search text
	const searchStart = searchIndex;
	const searchEnd = searchIndex + normalizedSearch.length;

	// Collect all highlight spans we create so we can clean them up later
	const highlightSpans: HTMLElement[] = [];

	for (const { node, start, end } of textNodes) {
		// Check if this node overlaps with our search range
		if (end <= searchStart || start >= searchEnd) {
			continue; // No overlap
		}

		// Calculate the overlap within this text node
		const overlapStart = Math.max(0, searchStart - start);
		const overlapEnd = Math.min(node.textContent!.length, searchEnd - start);

		// Handle whitespace normalization - find actual positions in the original text
		const originalText = node.textContent || '';
		let actualStart = 0;
		let normalizedPos = 0;

		// Find actual start position
		while (normalizedPos < overlapStart && actualStart < originalText.length) {
			if (/\s/.test(originalText[actualStart])) {
				// Skip consecutive whitespace (counts as 1 in normalized)
				while (actualStart < originalText.length - 1 && /\s/.test(originalText[actualStart + 1])) {
					actualStart++;
				}
			}
			actualStart++;
			normalizedPos++;
		}

		// Find actual end position
		let actualEnd = actualStart;
		while (normalizedPos < overlapEnd && actualEnd < originalText.length) {
			if (/\s/.test(originalText[actualEnd])) {
				while (actualEnd < originalText.length - 1 && /\s/.test(originalText[actualEnd + 1])) {
					actualEnd++;
				}
			}
			actualEnd++;
			normalizedPos++;
		}

		// Create a range for this portion
		try {
			const range = document.createRange();
			range.setStart(node, actualStart);
			range.setEnd(node, actualEnd);

			// Create a highlight span
			const highlightSpan = document.createElement('span');
			highlightSpan.className = 'reference-highlight reference-text-highlight';

			// Wrap the range contents with the highlight span
			range.surroundContents(highlightSpan);
			highlightSpans.push(highlightSpan);
		} catch {
			// surroundContents can fail in edge cases, just skip this node
			continue;
		}
	}

	if (highlightSpans.length === 0) {
		// Failed to create any highlights, fall back to whole element
		applyHighlightToElement(element);
		return false;
	}

	// Scroll to the first highlight span
	highlightSpans[0].scrollIntoView({
		behavior: 'smooth',
		block: 'center'
	});

	// Remove all highlight spans after animation, restoring original structure
	setTimeout(() => {
		for (const span of highlightSpans) {
			const parent = span.parentNode;
			if (parent) {
				// Move all children out of the span
				while (span.firstChild) {
					parent.insertBefore(span.firstChild, span);
				}
				// Remove the empty span
				parent.removeChild(span);
				// Normalize to merge adjacent text nodes
				parent.normalize();
			}
		}
	}, 2000);

	return true;
}

/**
 * Scrolls to a reference using fuzzy matching as fallback
 * Useful when the original block ID is no longer valid
 */
export function scrollToReferenceWithFallback(
	blockId: string,
	originalText: string,
	paperContainer: HTMLElement | null
): { success: boolean; usedFallback: boolean; textChanged: boolean } {
	if (!paperContainer) {
		return { success: false, usedFallback: false, textChanged: false };
	}

	// First try exact block ID match
	const targetElement = paperContainer.querySelector(`[data-block-id="${blockId}"]`);

	if (targetElement) {
		// Check if text has changed
		const currentText = targetElement.textContent || '';
		const textChanged = !currentText.includes(
			originalText.substring(0, Math.min(50, originalText.length))
		);

		// Try to highlight just the specific text, fall back to whole element
		highlightTextInElement(targetElement as HTMLElement, originalText);

		return { success: true, usedFallback: false, textChanged };
	}

	// Fallback: search for text content in actual block elements
	// This handles cases where UniqueID doesn't render data-block-id to DOM
	const blockSelectors = [
		'p', // paragraphs
		'li', // list items
		'div[data-type="preamble-clause"]', // resolution preamble
		'li[data-type="operative-clause"]', // resolution operative
		'li[data-type="sub-clause"]' // resolution sub-clauses
	];

	const allBlocks = paperContainer.querySelectorAll(blockSelectors.join(', '));
	const searchText = originalText.substring(0, Math.min(50, originalText.length));

	for (const block of allBlocks) {
		const blockText = block.textContent || '';
		// Check if the block contains the original text
		if (blockText.includes(searchText)) {
			// Highlight the specific text within the block
			highlightTextInElement(block as HTMLElement, originalText);
			// Text found exactly, so it hasn't changed (just block ID wasn't available)
			return { success: true, usedFallback: true, textChanged: false };
		}
	}

	return { success: false, usedFallback: true, textChanged: true };
}

/**
 * Gets the position information for a block element
 */
export function getBlockPosition(
	blockId: string,
	paperContainer: HTMLElement | null
): { top: number; left: number; height: number } | null {
	if (!paperContainer) return null;

	const element = paperContainer.querySelector(`[data-block-id="${blockId}"]`);
	if (!element) return null;

	const rect = element.getBoundingClientRect();
	const containerRect = paperContainer.getBoundingClientRect();

	return {
		top: rect.top - containerRect.top + paperContainer.scrollTop,
		left: rect.left - containerRect.left,
		height: rect.height
	};
}
