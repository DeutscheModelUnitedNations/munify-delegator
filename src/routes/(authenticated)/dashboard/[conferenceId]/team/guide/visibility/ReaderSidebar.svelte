<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '#lib/paraglide/messages';
	import type { GuideSection } from '#lib/guide/outline';
	import type { WorkspacePage } from '#lib/guide/workspace';
	import StateDot from '../tree/StateDot.svelte';

	/** The sidebar one group of readers gets from the draft, unpublished pages marked. */
	interface Props {
		sections: readonly GuideSection[];
		pages: readonly WorkspacePage[];
		hrefOf: (pageId: string) => ResolvedPathname;
		label: string;
	}

	let { sections, pages, hrefOf, label }: Props = $props();
	const byId = $derived(new Map(pages.map((page) => [page.id, page])));
	const count = $derived(sections.reduce((sum, section) => sum + section.entries.length, 0));
</script>

<section
	class="bg-base-200 rounded-box flex flex-col gap-1 p-3 lg:w-80 lg:shrink-0"
	aria-label={m.guideReaderSidebarOf({ reader: label })}
	data-tour="team.guideVisibility.sidebar"
	data-testid="guide-reader-sidebar"
>
	<div class="flex items-baseline gap-2 px-1 pb-1">
		<h2 class="font-semibold">{label}</h2>
		<span class="ml-auto text-sm opacity-70">{m.guideReaderPageCount({ count })}</span>
	</div>
	{#each sections as section (section.key)}
		<h3 class="px-1 pt-3 text-xs font-bold tracking-wider uppercase opacity-80">{section.title}</h3>
		<ul class="flex flex-col">
			{#each section.entries as entry (entry.key)}
				{@const page = byId.get(entry.pageId)}
				<li class={entry.indent ? 'ps-4' : ''}>
					<a
						href={hrefOf(entry.pageId)}
						class="hover:bg-base-100 flex min-h-8 items-center gap-2 rounded-sm px-1 text-sm"
					>
						{#if page}<StateDot state={page.state} />{/if}
						<span class="min-w-0 flex-1 truncate"
							>{entry.label || page?.title || m.guidePageMissing()}</span
						>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="px-1 text-sm opacity-70">{m.guideReaderSeesNothing()}</p>
	{/each}
</section>
