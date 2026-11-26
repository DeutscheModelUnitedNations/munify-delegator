<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import GuideContent from './GuideContent.svelte';
	import GuideNeighbour from './GuideNeighbour.svelte';

	/** One page of the guide: its title, the committee text, its text and the way on. */
	interface Props {
		page: {
			title: string;
			sectionTitle: string;
			content: unknown;
			pdfUrl?: string | null;
			previous?: { key: string; pageId: string; title: string } | null;
			next?: { key: string; pageId: string; title: string } | null;
		};
		hrefOf: (entry: { pageId: string; key?: string }) => string;
	}

	let { page, hrefOf }: Props = $props();
	const pageHref = (id: string) => hrefOf({ pageId: id });
</script>

<header class="mb-6 flex flex-col gap-1">
	<p class="text-base-content/60 text-sm">{page.sectionTitle}</p>
	<h1 class="text-3xl font-bold tracking-tight">{page.title}</h1>
</header>
{#if page.pdfUrl}
	<a href={page.pdfUrl} class="btn btn-outline btn-sm mb-6" target="_blank" rel="noopener">
		<i class="ph-duotone ph-file-pdf" aria-hidden="true"></i>
		{m.guideCommitteeTextDownload()}
	</a>
{/if}
<GuideContent content={page.content} {pageHref} />
<nav
	class="border-base-300 mt-10 grid gap-3 border-t pt-6 sm:grid-cols-2"
	aria-label={m.guidePreviousNext()}
>
	{#if page.previous}<GuideNeighbour entry={page.previous} direction="previous" {hrefOf} />{/if}
	{#if page.next}<GuideNeighbour entry={page.next} direction="next" {hrefOf} />{/if}
</nav>
