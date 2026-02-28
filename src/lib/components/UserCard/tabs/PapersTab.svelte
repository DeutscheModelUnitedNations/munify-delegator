<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { graphql } from '$houdini';
	import { getLocale } from '$lib/paraglide/runtime';

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

	const papers = $derived($papersQuery.data?.findManyPapers ?? []);

	let expandedPaperId = $state<string | null>(null);

	const toggleExpand = (id: string) => {
		expandedPaperId = expandedPaperId === id ? null : id;
	};

	const statusBadge = (status: string) => {
		switch (status) {
			case 'ACCEPTED':
				return 'badge-success';
			case 'CHANGES_REQUESTED':
				return 'badge-error';
			case 'SUBMITTED':
				return 'badge-info';
			case 'DRAFT':
				return 'badge-warning';
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
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="badge {statusBadge(paper.status)}">{paper.status}</span>
						<span class="font-bold">{paper.type}</span>
						{#if paper.agendaItem}
							<span class="text-base-content/60 text-sm">
								— {paper.agendaItem.committee?.abbreviation}: {paper.agendaItem.title}
							</span>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						{#if paper.versions.length > 0}
							<span class="text-base-content/60 text-xs">
								{m.userCardPaperVersions()}: {paper.versions.length}
							</span>
						{/if}
					</div>
				</div>
				<div class="mt-1 flex items-center justify-between">
					<span class="text-base-content/60 text-xs">
						{new Date(paper.createdAt).toLocaleDateString(getLocale())}
					</span>
					<button
						class="btn btn-ghost btn-xs btn-square"
						aria-label="Toggle details"
						onclick={() => toggleExpand(paper.id)}
					>
						<i class="fa-solid fa-chevron-{expandedPaperId === paper.id ? 'up' : 'down'}"></i>
					</button>
				</div>

				{#if expandedPaperId === paper.id && paper.versions.length > 0}
					<div class="mt-3 overflow-x-auto">
						<table class="table table-xs">
							<thead>
								<tr>
									<th>#</th>
									<th>{m.date()}</th>
									<th>{m.userCardPaperReviews()}</th>
								</tr>
							</thead>
							<tbody>
								{#each paper.versions as version, i (version.id)}
									<tr>
										<td>{i + 1}</td>
										<td>{new Date(version.createdAt).toLocaleDateString(getLocale())}</td>
										<td>{version.reviews.length}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
