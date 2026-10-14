<script lang="ts">
	import { getLocale } from '$lib/paraglide/runtime';
	import type { ResolvedPathname } from '$app/types';
	import { getPaperTypeIcon } from '$lib/utils/enumIcons';
	import { translatePaperType } from '$lib/utils/enumTranslations';
	import type { PapertypeEnum } from '$lib/api/rumbleClient/client';

	interface Props {
		papers: { id: string; type: PapertypeEnum; firstSubmittedAt: Date | null }[];
		/** Where a paper leads; already passed through `resolve()`. */
		paperHref: (paperId: string) => ResolvedPathname;
	}

	let { papers, paperHref }: Props = $props();

	const TYPE_COLORS: Record<PapertypeEnum, string> = {
		POSITION_PAPER: 'text-primary',
		WORKING_PAPER: 'text-secondary',
		INTRODUCTION_PAPER: 'text-accent'
	};

	const tip = (paper: Props['papers'][number]) =>
		[
			translatePaperType(paper.type),
			paper.firstSubmittedAt
				? new Date(paper.firstSubmittedAt).toLocaleDateString(getLocale())
				: null
		]
			.filter(Boolean)
			.join(' · ');
</script>

{#if papers.length === 0}
	<span class="text-base-content/20">–</span>
{:else}
	<div class="flex justify-center gap-1">
		{#each papers as paper (paper.id)}
			<a
				href={paperHref(paper.id)}
				class="btn btn-ghost btn-sm btn-square tooltip"
				data-tip={tip(paper)}
				aria-label={tip(paper)}
			>
				<i
					class="fa-sharp-duotone fa-solid {getPaperTypeIcon(paper.type)} {TYPE_COLORS[
						paper.type
					]} text-base"
				></i>
			</a>
		{/each}
	</div>
{/if}
