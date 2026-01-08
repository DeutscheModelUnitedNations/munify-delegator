import { Renderer, toPlainText } from 'better-svelte-email';
import type { Component } from 'svelte';

/**
 * Render a Svelte email component to HTML and plain text
 *
 * @param component - The Svelte component to render
 * @param props - Props to pass to the component
 * @returns Object containing rendered HTML and plain text versions
 */
export async function renderEmail<Props extends Record<string, unknown>>(
	component: Component<Props>,
	props: Props
): Promise<{ html: string; text: string }> {
	const { render } = new Renderer();
	const html = await render(component, { props });
	const text = toPlainText(html);

	return { html, text };
}
