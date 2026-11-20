<script lang="ts">
	import type { GuideMark, GuideNode } from '#lib/guide/document';
	import { isExternal, readerHref } from '#lib/guide/readerLinks';

	/** A run of text with its marks; a link to a guide page goes through `pageHref`. */
	let { node, pageHref }: { node: GuideNode; pageHref: (pageId: string) => string } = $props();

	const link = $derived(node.marks?.find((mark) => mark.type === 'link'));
	const href = $derived(readerHref({ href: link?.attrs?.href, pageHref }));
	const external = $derived(isExternal(href));
	const marks = $derived((node.marks ?? []).filter((mark) => mark.type !== 'link'));

	const TAGS: Record<string, string> = {
		bold: 'strong',
		italic: 'em',
		underline: 'u',
		strike: 's',
		code: 'code'
	};
</script>

{#snippet marked(value: string, rest: readonly GuideMark[])}
	{@const [mark, ...more] = rest}
	{@const tag = mark ? TAGS[mark.type] : undefined}
	{#if tag}<svelte:element this={tag}>{@render marked(value, more)}</svelte:element
		>{:else if mark}{@render marked(value, more)}{:else}{value}{/if}
{/snippet}

{#if href}
	<a
		{href}
		class="link link-primary"
		target={external ? '_blank' : undefined}
		rel={external ? 'noopener noreferrer' : undefined}>{@render marked(node.text ?? '', marks)}</a
	>
{:else}
	{@render marked(node.text ?? '', marks)}
{/if}
