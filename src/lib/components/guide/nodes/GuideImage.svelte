<script lang="ts">
	import type { GuideNode } from '#lib/guide/document';

	/** An image with its caption (its title, else its alt text). */
	let { node }: { node: GuideNode } = $props();

	const attr = (key: string) => {
		const value = node.attrs?.[key];
		return typeof value === 'string' && value !== '' ? value : undefined;
	};
	const caption = $derived(attr('title') ?? attr('alt'));
</script>

<figure>
	<img src={attr('src')} alt={attr('alt') ?? ''} loading="lazy" />
	{#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>
