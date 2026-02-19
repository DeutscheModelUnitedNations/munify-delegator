import { Renderer, toPlainText } from 'better-svelte-email';
import type { Component } from 'svelte';

type ExtractProps<C> = C extends Component<infer P, infer _E, infer _B> ? P : never;

/**
 * Render a Svelte email component to HTML and plain text
 *
 * @param component - The Svelte component to render
 * @param props - Props to pass to the component
 * @returns Object containing rendered HTML and plain text versions
 */
export async function renderEmail<C>(
	component: C,
	props: ExtractProps<C>
): Promise<{ html: string; text: string }> {
	const { render } = new Renderer();
	const html = await render(component, { props });
	const text = toPlainText(html);

	return { html, text };
}
