import Blockquote from '@tiptap/extension-blockquote';
import { findAndHighlightCite, type FindCiteResult } from '$lib/services/citeNavigation';

export interface BlockquoteWithFindOptions {
	/**
	 * Callback to get the paper container element for searching
	 */
	getPaperContainer: () => HTMLElement | null;
	/**
	 * Localized label for "Find in paper" tooltip
	 */
	findInPaperLabel: string;
	/**
	 * Localized label for "Quote not found" tooltip
	 */
	citeNotFoundLabel: string;
}

/**
 * Extended Blockquote extension that adds a "find in paper" button
 */
export const BlockquoteWithFind = Blockquote.extend<BlockquoteWithFindOptions>({
	addOptions() {
		return {
			...this.parent?.(),
			getPaperContainer: () => null,
			findInPaperLabel: 'Find in paper',
			citeNotFoundLabel: 'Quote not found'
		};
	},

	addNodeView() {
		return ({ node, HTMLAttributes, getPos, editor }) => {
			// Create the blockquote element
			const blockquote = document.createElement('blockquote');

			// Apply any HTML attributes
			Object.entries(HTMLAttributes).forEach(([key, value]) => {
				if (value !== null && value !== undefined) {
					blockquote.setAttribute(key, String(value));
				}
			});

			// Create content container
			const content = document.createElement('div');
			content.className = 'blockquote-content';
			blockquote.appendChild(content);

			// Get localized labels from options
			const { findInPaperLabel, citeNotFoundLabel } = this.options;

			// Create tooltip wrapper for DaisyUI tooltip
			const tooltipWrapper = document.createElement('div');
			tooltipWrapper.className = 'tooltip tooltip-left cite-find-wrapper';
			tooltipWrapper.setAttribute('data-tip', findInPaperLabel);

			// Create find button with DaisyUI classes
			const findButton = document.createElement('button');
			findButton.className = 'btn btn-ghost btn-xs btn-square text-primary';
			findButton.type = 'button';
			findButton.innerHTML = '<i class="fa-solid fa-magnifying-glass text-xs"></i>';

			// Handle click
			findButton.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();

				// Get the text content of this blockquote
				const text = content.textContent || '';

				// Get the paper container
				const paperContainer = this.options.getPaperContainer();

				if (!paperContainer) {
					findButton.classList.remove('text-primary');
					findButton.classList.add('text-error');
					tooltipWrapper.setAttribute('data-tip', citeNotFoundLabel);
					setTimeout(() => {
						findButton.classList.remove('text-error');
						findButton.classList.add('text-primary');
						tooltipWrapper.setAttribute('data-tip', findInPaperLabel);
					}, 2000);
					return;
				}

				// Search for the text
				const result: FindCiteResult = findAndHighlightCite(text, paperContainer);

				if (!result.found) {
					findButton.classList.remove('text-primary');
					findButton.classList.add('text-error');
					tooltipWrapper.setAttribute('data-tip', citeNotFoundLabel);
					setTimeout(() => {
						findButton.classList.remove('text-error');
						findButton.classList.add('text-primary');
						tooltipWrapper.setAttribute('data-tip', findInPaperLabel);
					}, 2000);
				}
			});

			tooltipWrapper.appendChild(findButton);
			blockquote.appendChild(tooltipWrapper);

			return {
				dom: blockquote,
				contentDOM: content,
				ignoreMutation: (mutation) => {
					// Ignore mutations to our custom elements
					return (
						mutation.target === findButton ||
						mutation.target === tooltipWrapper ||
						mutation.target === blockquote ||
						tooltipWrapper.contains(mutation.target as Node)
					);
				}
			};
		};
	}
});
