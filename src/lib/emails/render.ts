import { render } from 'svelte-email';
import type { Component } from 'svelte';

/**
 * Render a Svelte email component to HTML and plain text
 *
 * @param component - The Svelte component to render
 * @param props - Props to pass to the component
 * @returns Object containing rendered HTML and plain text versions
 */
export function renderEmail<Props extends Record<string, unknown>>(
	component: Component<Props>,
	props: Props
): { html: string; text: string } {
	const html = render({ component, props });

	// Generate plain text version by stripping HTML tags
	const text = html
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, ' ')
		.trim();

	return { html, text };
}
