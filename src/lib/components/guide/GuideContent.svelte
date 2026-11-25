<script lang="ts">
	import GuideNodes from './GuideNodes.svelte';
	import { parseGuideDocument } from '#lib/guide/document';
	import { setPageHref } from './guideLinks';

	/** A guide page's text for readers, from the TipTap JSON the API resolved for them. */
	let { content, pageHref }: { content: unknown; pageHref: (pageId: string) => string } = $props();

	const doc = $derived(parseGuideDocument(content));
	setPageHref(() => pageHref);
</script>

<div class="prose max-w-none" data-testid="guide-content">
	<GuideNodes nodes={doc.content} />
</div>
