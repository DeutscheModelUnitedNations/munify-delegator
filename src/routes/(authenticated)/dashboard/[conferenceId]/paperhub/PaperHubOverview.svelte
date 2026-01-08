<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { queryParam } from 'sveltekit-search-params';
	import type { PaperStatus$options } from '$houdini';
	import PaperStatusBadges from './PaperStatusBadges.svelte';
	import PaperTable from './PaperTable.svelte';
	import { SvelteMap } from 'svelte/reactivity';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const papersGroupedQuery = graphql(`
		query PapersGroupedQuery($conferenceId: String!) {
			findPapersGroupedByCommittee(conferenceId: $conferenceId) {
				committee {
					id
					name
					abbreviation
				}
				agendaItems {
					agendaItem {
						id
						title
					}
					papers {
						id
						type
						status
						createdAt
						updatedAt
						firstSubmittedAt
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
					}
				}
			}
		}
	`);

	const introductionPapersQuery = graphql(`
		query IntroductionPapersQuery($conferenceId: String!) {
			findIntroductionPapers(conferenceId: $conferenceId) {
				id
				type
				status
				createdAt
				updatedAt
				firstSubmittedAt
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
			}
		}
	`);

	$effect(() => {
		papersGroupedQuery.fetch({ variables: { conferenceId } });
		introductionPapersQuery.fetch({ variables: { conferenceId } });
	});

	let introductionPapers = $derived($introductionPapersQuery?.data?.findIntroductionPapers ?? []);
	let showIntroductionPapers = $derived(introductionPapers.length > 0);

	// Store expanded state in URL params using sveltekit-search-params
	const expandedCommittee = queryParam('committee');
	const expandedAgendaItem = queryParam('topic');

	const toggleCommittee = (committeeId: string) => {
		if ($expandedCommittee === committeeId) {
			$expandedCommittee = null;
			$expandedAgendaItem = null;
		} else {
			$expandedCommittee = committeeId;
			$expandedAgendaItem = null;
		}
	};

	const toggleAgendaItem = (agendaItemId: string) => {
		if ($expandedAgendaItem === agendaItemId) {
			$expandedAgendaItem = null;
		} else {
			$expandedAgendaItem = agendaItemId;
		}
	};

	// Status counting helper
	const countByStatus = (papers: Array<{ status: PaperStatus$options }>) => {
		const counts = { total: papers.length, SUBMITTED: 0, CHANGES_REQUESTED: 0, ACCEPTED: 0 };
		for (const paper of papers) {
			if (paper.status in counts) {
				counts[paper.status as keyof typeof counts]++;
			}
		}
		return counts;
	};

	// Sorting state per agenda item
	let sortConfig = new SvelteMap<string, { key: string; direction: 'asc' | 'desc' }>();

	const getSortedPapers = (agendaItemId: string, papers: any[]) => {
		const config = sortConfig.get(agendaItemId);
		if (!config) return papers;

		return [...papers].sort((a, b) => {
			let aVal: any, bVal: any;

			switch (config.key) {
				case 'country':
					aVal =
						a.delegation.assignedNation?.alpha3Code ||
						a.delegation.assignedNonStateActor?.name ||
						'';
					bVal =
						b.delegation.assignedNation?.alpha3Code ||
						b.delegation.assignedNonStateActor?.name ||
						'';
					break;
				case 'type':
					aVal = a.type;
					bVal = b.type;
					break;
				case 'status':
					aVal = a.status;
					bVal = b.status;
					break;
				case 'createdAt':
				case 'updatedAt':
				case 'firstSubmittedAt':
					aVal = a[config.key] ? new Date(a[config.key]).getTime() : 0;
					bVal = b[config.key] ? new Date(b[config.key]).getTime() : 0;
					break;
				default:
					return 0;
			}

			if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
			if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
			return 0;
		});
	};

	const toggleSort = (agendaItemId: string, key: string) => {
		const current = sortConfig.get(agendaItemId);
		if (current?.key === key) {
			sortConfig.set(agendaItemId, {
				key,
				direction: current.direction === 'asc' ? 'desc' : 'asc'
			});
		} else {
			sortConfig.set(agendaItemId, { key, direction: 'asc' });
		}
	};

	const getSortConfig = (agendaItemId: string) => {
		return sortConfig.get(agendaItemId) ?? null;
	};
</script>

<div class="flex flex-col gap-3 w-full">
	{#if $papersGroupedQuery.fetching}
		<div class="flex justify-center p-8">
			<i class="fa-duotone fa-spinner fa-spin text-4xl"></i>
		</div>
	{:else if $papersGroupedQuery.errors?.length}
		<div class="alert alert-error">
			<i class="fa-solid fa-exclamation-triangle"></i>
			<span>{$papersGroupedQuery.errors[0].message}</span>
		</div>
	{:else if $papersGroupedQuery.data?.findPapersGroupedByCommittee?.length}
		{#each $papersGroupedQuery.data.findPapersGroupedByCommittee as committeeGroup}
			{@const committeeCounts = countByStatus(
				committeeGroup.agendaItems.flatMap((ai) => ai.papers)
			)}
			<div class="border border-base-300 rounded-lg bg-base-100">
				<!-- Committee Header -->
				<div
					class="p-4 cursor-pointer rounded-t-lg transition-colors hover:bg-primary/5"
					class:rounded-b-lg={$expandedCommittee !== committeeGroup.committee.id}
					onclick={() => toggleCommittee(committeeGroup.committee.id)}
					role="button"
					tabindex="0"
					onkeypress={(e) => e.key === 'Enter' && toggleCommittee(committeeGroup.committee.id)}
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<i
								class="fa-solid {$expandedCommittee === committeeGroup.committee.id
									? 'fa-chevron-down'
									: 'fa-chevron-right'} text-base-content/50"
							></i>
							<div class="flex items-center gap-2">
								<span class="badge badge-primary font-bold"
									>{committeeGroup.committee.abbreviation}</span
								>
								<h3 class="text-lg font-semibold">{committeeGroup.committee.name}</h3>
							</div>
						</div>
						<PaperStatusBadges counts={committeeCounts} />
					</div>
				</div>

				<!-- Agenda Items (expanded) -->
				{#if $expandedCommittee === committeeGroup.committee.id}
					<div class="p-4 pt-2">
						{#each committeeGroup.agendaItems as agendaItemGroup, index}
							{@const agendaCounts = countByStatus(agendaItemGroup.papers)}
							<div
								class="border border-base-200 rounded-md mb-2 last:mb-0"
								class:bg-base-50={index % 2 === 0}
							>
								<!-- Agenda Item Header -->
								<div
									class="p-3 cursor-pointer rounded-t-md transition-colors hover:bg-secondary/5"
									class:rounded-b-md={$expandedAgendaItem !== agendaItemGroup.agendaItem.id}
									onclick={() => toggleAgendaItem(agendaItemGroup.agendaItem.id)}
									role="button"
									tabindex="0"
									onkeypress={(e) =>
										e.key === 'Enter' && toggleAgendaItem(agendaItemGroup.agendaItem.id)}
								>
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-3">
											<i
												class="fa-solid {$expandedAgendaItem === agendaItemGroup.agendaItem.id
													? 'fa-chevron-down'
													: 'fa-chevron-right'} text-base-content/40 text-sm"
											></i>
											<h4 class="font-medium text-sm">{agendaItemGroup.agendaItem.title}</h4>
										</div>
										<PaperStatusBadges counts={agendaCounts} size="small" />
									</div>
								</div>

								<!-- Papers List (expanded) -->
								{#if $expandedAgendaItem === agendaItemGroup.agendaItem.id}
									<div class="px-4 pb-3 border-t border-base-200">
										<PaperTable
											papers={getSortedPapers(
												agendaItemGroup.agendaItem.id,
												agendaItemGroup.papers
											)}
											sortable={true}
											sortConfig={getSortConfig(agendaItemGroup.agendaItem.id)}
											onSort={(key) => toggleSort(agendaItemGroup.agendaItem.id, key)}
										/>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}

		<!-- Introduction Papers Section (NSA papers without agenda items) -->
		{#if showIntroductionPapers}
			{@const introCounts = countByStatus(introductionPapers)}
			<div class="border border-base-300 rounded-lg bg-base-100">
				<div
					class="p-4 cursor-pointer rounded-t-lg transition-colors hover:bg-secondary/5"
					class:rounded-b-lg={$expandedCommittee !== 'introduction'}
					onclick={() => {
						if ($expandedCommittee === 'introduction') {
							$expandedCommittee = null;
						} else {
							$expandedCommittee = 'introduction';
							$expandedAgendaItem = null;
						}
					}}
					role="button"
					tabindex="0"
					onkeypress={(e) => {
						if (e.key === 'Enter') {
							if ($expandedCommittee === 'introduction') {
								$expandedCommittee = null;
							} else {
								$expandedCommittee = 'introduction';
								$expandedAgendaItem = null;
							}
						}
					}}
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<i
								class="fa-solid {$expandedCommittee === 'introduction'
									? 'fa-chevron-down'
									: 'fa-chevron-right'} text-base-content/50"
							></i>
							<div class="flex items-center gap-2">
								<span class="badge badge-secondary font-bold">
									{m.nonStateActorAbbreviation()}
								</span>
								<h3 class="text-lg font-semibold">{m.paperTypeIntroductionPapers()}</h3>
							</div>
						</div>
						<PaperStatusBadges counts={introCounts} />
					</div>
				</div>

				{#if $expandedCommittee === 'introduction'}
					<div class="px-4 pb-3 border-t border-base-200">
						<PaperTable
							papers={getSortedPapers('introduction', introductionPapers)}
							sortable={true}
							sortConfig={getSortConfig('introduction')}
							onSort={(key) => toggleSort('introduction', key)}
						/>
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<div class="alert alert-info">
			<i class="fa-solid fa-info-circle"></i>
			<span>{m.noPapersSubmittedYet()}</span>
		</div>
	{/if}
</div>
