<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { translatePaperStatus, translatePaperType } from '#lib/utils/enumTranslations';
	import { fetchPapers, paperStatusBadge } from './papers';

	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const papers = $derived(await fetchPapers({ userId, conferenceId }));

	const totalReviews = (paper: (typeof papers)[number]) =>
		paper.versions.reduce((sum, v) => sum + v.reviews.length, 0);
</script>

{#if papers.length === 0}
	<div class="alert alert-info">
		<i aria-hidden="true" class="ph-duotone ph-file-text"></i>
		<span>{m.userCardNoPapers()}</span>
	</div>
{:else}
	<div class="flex flex-col gap-3">
		{#each papers as paper (paper.id)}
			<a
				href={resolve('/(authenticated)/dashboard/[conferenceId]/paperhub/[paperId]', {
					conferenceId,
					paperId: paper.id
				})}
				target="_blank"
				rel="noopener noreferrer"
				class="bg-base-200 hover:bg-base-300 rounded-box block p-4"
				title={m.goToPaperHub()}
			>
				<div class="flex items-start justify-between gap-2">
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2">
							<span class="badge badge-sm {paperStatusBadge(paper.status)}">
								{translatePaperStatus(paper.status)}
							</span>
							<span class="font-bold">{translatePaperType(paper.type)}</span>
						</div>
						{#if paper.agendaItem}
							<span class="text-base-content/60 text-sm">
								{paper.agendaItem.committee?.abbreviation}: {paper.agendaItem.title}
							</span>
						{/if}
					</div>
					<i aria-hidden="true" class="ph-duotone ph-arrow-square-out text-base-content/60"></i>
				</div>

				<div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-base-content/60">
					{#if paper.firstSubmittedAt}
						<span class="flex items-center gap-1">
							<i aria-hidden="true" class="ph-duotone ph-paper-plane-tilt"></i>
							{new Date(paper.firstSubmittedAt).toLocaleDateString(getLocale())}
						</span>
					{/if}
					<span class="flex items-center gap-1">
						<i aria-hidden="true" class="ph-duotone ph-stack"></i>
						{paper.versions.length}
						{m.userCardPaperVersions()}
					</span>
					{#if totalReviews(paper) > 0}
						<span class="flex items-center gap-1">
							<i aria-hidden="true" class="ph-duotone ph-chats"></i>
							{totalReviews(paper)}
							{m.userCardPaperReviews()}
						</span>
					{/if}
				</div>
			</a>
		{/each}
	</div>
{/if}
