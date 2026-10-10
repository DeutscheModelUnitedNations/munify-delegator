<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import Flag from '$lib/components/Flag.svelte';
	import PaperTypeStatusColumns from './PaperTypeStatusColumns.svelte';
	import { groupPapersByDelegation } from './supervisedPapers';
	import { goto } from '$app/navigation';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	function fetchSupervisedPapers() {
		return client.query.findSupervisedPapers({
			__args: { conferenceId },
			id: true,
			type: true,
			status: true,
			firstSubmittedAt: true,
			agendaItem: { title: true, committee: { abbreviation: true } },
			delegation: {
				id: true,
				assignedNation: { alpha2Code: true, alpha3Code: true },
				assignedNonStateActor: { name: true, fontAwesomeIcon: true }
			},
			author: { id: true, givenName: true, familyName: true }
		});
	}

	let supervisedPapers = $state<Awaited<ReturnType<typeof fetchSupervisedPapers>>>();
	let loading = $state(false);

	$effect(() => {
		loading = true;
		void fetchSupervisedPapers()
			.then((result) => {
				supervisedPapers = result;
			})
			.finally(() => {
				loading = false;
			});
	});

	type SupervisedPaper = Awaited<ReturnType<typeof fetchSupervisedPapers>>[number];

	let papersData = $derived(supervisedPapers ?? []);

	// Group papers by delegation
	let papersByDelegation = $derived(groupPapersByDelegation(papersData));

	let statusCounts = $derived({
		total: papersData.length,
		submitted: papersData.filter((p) => p.status === 'SUBMITTED').length,
		changesRequested: papersData.filter((p) => p.status === 'CHANGES_REQUESTED').length,
		accepted: papersData.filter((p) => p.status === 'ACCEPTED').length
	});

	const handlePaperClick = (paperId: string) => {
		goto(resolve(`/dashboard/${conferenceId}/paperhub/${paperId}`));
	};

	const formatDate = (date: Date | string | null | undefined) => {
		if (!date) return '-';
		return new Date(date).toLocaleDateString();
	};
</script>

{#snippet topic(agendaItem: SupervisedPaper['agendaItem'])}
	{#if agendaItem}
		{#if agendaItem.committee?.abbreviation}
			<span class="badge badge-soft badge-primary badge-sm mr-1">
				{agendaItem.committee.abbreviation}
			</span>
		{/if}
		{agendaItem.title}
	{:else}
		<span class="text-base-content/40">-</span>
	{/if}
{/snippet}

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
			<i class="fa-sharp-duotone fa-solid fa-info-circle"></i>
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
									<PaperTypeStatusColumns />
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
										<PaperTypeStatusColumns {paper} />
										<td class="align-middle break-words">
											{@render topic(paper.agendaItem)}
										</td>
										<td class="align-middle whitespace-nowrap">
											{paper.author.givenName}
											{paper.author.familyName}
										</td>
										<td class="align-middle text-sm text-base-content/60 whitespace-nowrap">
											{formatDate(paper.firstSubmittedAt)}
										</td>
										<td class="align-middle">
											<button class="btn btn-ghost btn-xs" aria-label={m.openPaper()}>
												<i class="fa-sharp-duotone fa-solid fa-arrow-right"></i>
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
