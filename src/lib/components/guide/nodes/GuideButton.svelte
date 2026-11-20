<script lang="ts">
	import type { GuideNode } from '#lib/guide/document';
	import { isExternal, readerHref } from '#lib/guide/readerLinks';

	/** A button to a guide page, a file or the web. */
	let { node, pageHref }: { node: GuideNode; pageHref: (pageId: string) => string } = $props();

	const href = $derived(readerHref({ href: node.attrs?.href, pageHref }));
	const external = $derived(isExternal(href));
	const label = $derived(typeof node.attrs?.label === 'string' ? node.attrs.label : '');
</script>

{#if href}
	<p class="not-prose my-4">
		<a
			{href}
			class="btn btn-primary"
			target={external ? '_blank' : undefined}
			rel={external ? 'noopener noreferrer' : undefined}
			>{label || href}
			<i class="ph-duotone ph-arrow-right" aria-hidden="true"></i></a
		>
	</p>
{/if}
