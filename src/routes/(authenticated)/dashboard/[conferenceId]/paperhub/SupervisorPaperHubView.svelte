<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import PaperEnum from '$lib/components/Paper/PaperEnum';
	import { goto } from '$app/navigation';
	import type { PaperStatus$options, PaperType$options } from '$houdini';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const supervisedPapersQuery = graphql(`
		query FindSupervisedPapersQuery($conferenceId: String!) {
			findSupervisedPapers(conferenceId: $conferenceId) {
				id
				type
				status
				createdAt
				updatedAt
				firstSubmittedAt
				agendaItem {
					id
					title
					committee {
						id
						abbreviation
					}
				}
				delegation {
					id
					assignedNation {
						alpha2Code
						alpha3Code
					}
					assignedNonStateActor {
						id
						name
						abbreviation
						fontAwesomeIcon
					}
				}
				author {
					id
					given_name
					family_name
				}
			}
		}
	`);

	$effect(() => {
		supervisedPapersQuery.fetch({ variables: { conferenceId } });
	});

	let papersData = $derived($supervisedPapersQuery?.data?.findSupervisedPapers ?? []);
	let loading = $derived($supervisedPapersQuery.fetching);

	// Group papers by delegation
	let papersByDelegation = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- Map is temporary, converted to array
		const groups = new Map<
			string,
			{
				delegationId: string;
				delegationName: string;
				alpha2Code?: string;
				nsa?: boolean;
				icon?: string | null;
				papers: typeof papersData;
			}
		>();

		for (const paper of papersData) {
			const delegationId = paper.delegation.id;
			if (!groups.has(delegationId)) {
				const nation = paper.delegation.assignedNation;
				const nsa = paper.delegation.assignedNonStateActor;
				groups.set(delegationId, {
					delegationId,
					delegationName: nation
						? getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)
						: (nsa?.name ?? 'Unknown'),
					alpha2Code: nation?.alpha2Code,
					nsa: !!nsa,
					icon: nsa?.fontAwesomeIcon,
					papers: []
				});
			}
			groups.get(delegationId)!.papers.push(paper);
		}

		return [...groups.values()].sort((a, b) => a.delegationName.localeCompare(b.delegationName));
	});

	let statusCounts = $derived({
		total: papersData.length,
		submitted: papersData.filter((p) => p.status === 'SUBMITTED').length,
		changesRequested: papersData.filter((p) => p.status === 'CHANGES_REQUESTED').length,
		accepted: papersData.filter((p) => p.status === 'ACCEPTED').length
	});

	const handlePaperClick = (paperId: string) => {
		goto(`./paperhub/${paperId}`);
	};

	const formatDate = (date: string | null | undefined) => {
		if (!date) return '-';
		return new Date(date).toLocaleDateString();
	};
</script>

<div class="flex flex-col gap-6">
	<!-- Summary stats -->
	<div class="stats shadow bg-base-200">
		<div class="stat">
			<div class="stat-title">{m.supervisorPapersTotal()}</div>
			<div class="stat-value">{statusCounts.total}</div>
		</div>
		<div class="stat">
			<div class="stat-title">{m.paperStatusSubmitted()}</div>
			<div class="stat-value text-warning">{statusCounts.submitted}</div>
		</div>
		<div class="stat">
			<div class="stat-title">{m.paperStatusChangesRequested()}</div>
			<div class="stat-value text-error">{statusCounts.changesRequested}</div>
		</div>
		<div class="stat">
			<div class="stat-title">{m.paperStatusAccepted()}</div>
			<div class="stat-value text-success">{statusCounts.accepted}</div>
		</div>
	</div>

	{#if loading}
		<div class="flex justify-center py-8">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if papersByDelegation.length === 0}
		<div class="alert alert-info">
			<i class="fa-solid fa-info-circle"></i>
			<span>{m.supervisorPapersEmpty()}</span>
		</div>
	{:else}
		<!-- Papers grouped by delegation -->
		{#each papersByDelegation as delegation (delegation.delegationId)}
			<div class="card bg-base-200 shadow-md">
				<div class="card-body">
					<h3 class="card-title flex items-center gap-2">
						<Flag
							size="sm"
							alpha2Code={delegation.alpha2Code}
							nsa={delegation.nsa}
							icon={delegation.icon}
						/>
						{delegation.delegationName}
						<span class="badge badge-neutral">{delegation.papers.length}</span>
					</h3>

					<div class="overflow-x-auto">
						<table class="table table-sm w-full align-middle">
							<thead>
								<tr>
									<th class="w-0">{m.paperType()}</th>
									<th class="w-0">{m.paperStatus()}</th>
									<th>{m.paperTopic()}</th>
									<th class="w-0 whitespace-nowrap">{m.author()}</th>
									<th class="w-0 whitespace-nowrap">{m.submittedAt()}</th>
									<th class="w-0"></th>
								</tr>
							</thead>
							<tbody>
								{#each delegation.papers as paper (paper.id)}
									<tr
										class="hover cursor-pointer"
										onclick={() => handlePaperClick(paper.id)}
										role="button"
										tabindex="0"
										onkeydown={(e) => e.key === 'Enter' && handlePaperClick(paper.id)}
									>
										<td class="align-middle">
											<PaperEnum.Type type={paper.type} size="xs" />
										</td>
										<td class="align-middle">
											<PaperEnum.Status status={paper.status} size="xs" />
										</td>
										<td class="align-middle break-words">
											{#if paper.agendaItem}
												{#if paper.agendaItem.committee?.abbreviation}
													<span class="badge badge-soft badge-primary badge-sm mr-1">
														{paper.agendaItem.committee.abbreviation}
													</span>
												{/if}
												{paper.agendaItem.title}
											{:else}
												<span class="text-base-content/40">-</span>
											{/if}
										</td>
										<td class="align-middle whitespace-nowrap">
											{paper.author.given_name}
											{paper.author.family_name}
										</td>
										<td class="align-middle text-sm text-base-content/60 whitespace-nowrap">
											{formatDate(paper.firstSubmittedAt)}
										</td>
										<td class="align-middle">
											<button class="btn btn-ghost btn-xs" aria-label={m.openPaper()}>
												<i class="fa-solid fa-arrow-right"></i>
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/each}
	{/if}
</div>
