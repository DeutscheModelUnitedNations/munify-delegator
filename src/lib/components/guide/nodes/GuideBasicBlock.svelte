<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { GuideNode } from '#lib/guide/document';

	/** Paragraphs, headings, lists, list items and quotes: an element around the children. */
	let {
		node,
		children
	}: { node: GuideNode; pageHref: (pageId: string) => string; children?: Snippet } = $props();

	const level = $derived(
		typeof node.attrs?.level === 'number' ? Math.min(4, Math.max(2, node.attrs.level)) : 2
	);
	const TAGS: Record<string, string> = {
		paragraph: 'p',
		bulletList: 'ul',
		orderedList: 'ol',
		listItem: 'li',
		blockquote: 'blockquote'
	};
	const tag = $derived(node.type === 'heading' ? `h${level}` : (TAGS[node.type] ?? 'div'));
	const id = $derived(typeof node.attrs?.id === 'string' ? node.attrs.id : undefined);
	const start = $derived(typeof node.attrs?.start === 'number' ? node.attrs.start : undefined);
</script>

{#if tag === 'ol'}
	<ol {start}>{@render children?.()}</ol>
{:else}
	<svelte:element this={tag} {id} class={id ? 'scroll-mt-24' : undefined}>
		{@render children?.()}
	</svelte:element>
{/if}
