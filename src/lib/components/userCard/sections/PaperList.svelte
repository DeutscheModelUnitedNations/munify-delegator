<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { translatePaperStatus, translatePaperType } from '#lib/utils/enumTranslations';
	import Empty from '../ui/Empty.svelte';
	import Row from '../ui/Row.svelte';
	import { fetchPapers, paperStatusBadge } from '../tabs/papers';

	/** The person's papers, how far each of them is, and the way to it. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const papers = $derived(await fetchPapers({ userId, conferenceId }));
	type Paper = (typeof papers)[number];

	const topic = ({ agendaItem }: Paper) =>
		agendaItem
			? [agendaItem.committee?.abbreviation, agendaItem.title].filter(Boolean).join(': ')
			: m.userCardTabPapers();
	const reviewsOf = (paper: Paper) =>
		paper.versions.reduce((sum, version) => sum + version.reviews.length, 0);
</script>

{#if papers.length === 0}
	<Empty icon="file-dashed" text={m.userCardNoPapers()} />
{:else}
	{#each papers as paper (paper.id)}
		{@const reviews = reviewsOf(paper)}
		<Row icon="file-text" title={topic(paper)}>
			<a
				class="link link-hover font-bold"
				href={resolve('/(authenticated)/dashboard/[conferenceId]/paperhub/[paperId]', {
					conferenceId,
					paperId: paper.id
				})}
				target="_blank"
				rel="noopener noreferrer"
				title={m.goToPaperHub()}
			>
				{translatePaperType(paper.type)}
				<i aria-hidden="true" class="ph-duotone ph-arrow-square-out"></i>
			</a>
			<span class="text-base-content/60 flex flex-wrap gap-x-3 text-xs">
				{#if paper.firstSubmittedAt}
					<span>
						<i aria-hidden="true" class="ph-duotone ph-paper-plane-tilt"></i>
						{new Date(paper.firstSubmittedAt).toLocaleDateString(getLocale())}
					</span>
				{/if}
				<span>
					<i aria-hidden="true" class="ph-duotone ph-stack"></i>
					{paper.versions.length}
					{m.userCardPaperVersions()}
				</span>
				{#if reviews > 0}
					<span>
						<i aria-hidden="true" class="ph-duotone ph-chats"></i>
						{reviews}
						{m.userCardPaperReviews()}
					</span>
				{/if}
			</span>
			{#snippet actions()}
				<span class="badge badge-sm {paperStatusBadge(paper.status)}">
					{translatePaperStatus(paper.status)}
				</span>
			{/snippet}
		</Row>
	{/each}
{/if}
