import type { Attachment } from 'svelte/attachments';

/**
 * Fades an element in once it scrolls into view. The hidden state is applied here rather than in
 * the markup, so the server-rendered page stays readable without JavaScript.
 */
export const reveal: Attachment<HTMLElement> = (node) => {
	node.classList.add('reveal');
	const observer = new IntersectionObserver(
		(entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				node.classList.add('is-visible');
				observer.disconnect();
			}
		},
		{ threshold: 0.15 }
	);
	observer.observe(node);
	return () => observer.disconnect();
};
