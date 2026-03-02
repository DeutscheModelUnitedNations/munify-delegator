<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { graphql } from '$houdini';
	import { getLocale } from '$lib/paraglide/runtime';
	import { translatePaperStatus, translatePaperType } from '$lib/services/enumTranslations';

	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const papersQuery = graphql(`
		query UserCardPapersQuery($conferenceId: String!, $userId: String!) {
			findManyPapers(
				where: { conferenceId: { equals: $conferenceId }, authorId: { equals: $userId } }
			) {
				id
				type
				status
				firstSubmittedAt
				createdAt
				agendaItem {
					id
					title
					committee {
						id
						abbreviation
					}
				}
				versions {
					id
					createdAt
					reviews {
						id
						statusBefore
						statusAfter
						createdAt
					}
				}
			}
		}
	`);

	$effect(() => {
		papersQuery.fetch({ variables: { conferenceId, userId } });
	});

	const papers = $derived(
		($papersQuery.data?.findManyPapers ?? []).filter((p) => p.status !== 'DRAFT')
	);

	const totalReviews = (paper: (typeof papers)[number]) =>
		paper.versions.reduce((sum, v) => sum + v.reviews.length, 0);

	const statusBadge = (status: string) => {
		switch (status) {
			case 'ACCEPTED':
				return 'badge-success';
			case 'CHANGES_REQUESTED':
				return 'badge-error';
			case 'SUBMITTED':
				return 'badge-info';
			case 'REVISED':
				return 'badge-accent';
			default:
				return 'badge-ghost';
		}
	};
</script>

{#if $papersQuery.fetching}
	<div class="flex flex-col gap-3">
		<div class="skeleton h-20 w-full"></div>
		<div class="skeleton h-20 w-full"></div>
	</div>
{:else if papers.length === 0}
	<div class="alert alert-info">
		<i class="fa-duotone fa-file-lines"></i>
		<span>{m.userCardNoPapers()}</span>
	</div>
{:else}
	<div class="flex flex-col gap-3">
		{#each papers as paper (paper.id)}
			<div class="bg-base-200 rounded-lg p-4">
				<div class="flex items-start justify-between gap-2">
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2">
							<span class="badge badge-sm {statusBadge(paper.status)}">
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
					<a
						href="/dashboard/{conferenceId}/paperhub/{paper.id}"
						target="_blank"
						rel="noopener noreferrer"
						class="btn btn-ghost btn-xs btn-square"
						title={m.goToPaperHub()}
					>
						<i class="fa-duotone fa-arrow-up-right-from-square"></i>
					</a>
				</div>

				<div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-base-content/60">
					{#if paper.firstSubmittedAt}
						<span class="flex items-center gap-1">
							<i class="fa-duotone fa-paper-plane"></i>
							{new Date(paper.firstSubmittedAt).toLocaleDateString(getLocale())}
						</span>
					{/if}
					<span class="flex items-center gap-1">
						<i class="fa-duotone fa-layer-group"></i>
						{paper.versions.length}
						{m.userCardPaperVersions()}
					</span>
					{#if totalReviews(paper) > 0}
						<span class="flex items-center gap-1">
							<i class="fa-duotone fa-comments"></i>
							{totalReviews(paper)}
							{m.userCardPaperReviews()}
						</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
