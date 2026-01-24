<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { queryParam } from 'sveltekit-search-params';
	import PaperTable from './PaperTable.svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	// Search state
	let searchQuery = $state('');

	const globalPapersGroupedQuery = graphql(`
		query GlobalPapersGroupedQuery($conferenceId: String!) {
			findGlobalPapersGroupedByCommittee(conferenceId: $conferenceId) {
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

	const globalIntroductionPapersQuery = graphql(`
		query GlobalIntroductionPapersQuery($conferenceId: String!) {
			findGlobalIntroductionPapers(conferenceId: $conferenceId) {
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
		globalPapersGroupedQuery.fetch({ variables: { conferenceId } });
		globalIntroductionPapersQuery.fetch({ variables: { conferenceId } });
	});

	let introductionPapers = $derived(
		$globalIntroductionPapersQuery?.data?.findGlobalIntroductionPapers ?? []
	);
	let showIntroductionPapers = $derived(introductionPapers.length > 0);

	// Store expanded state in URL params
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

	// Filter papers by search query (delegation name)
	const filterPapersBySearch = (papers: any[]) => {
		if (!searchQuery.trim()) return papers;

		const query = searchQuery.toLowerCase().trim();
		return papers.filter((paper) => {
			const nation = paper.delegation.assignedNation;
			const nsa = paper.delegation.assignedNonStateActor;

			if (nation) {
				const countryName = getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code);
				return countryName.toLowerCase().includes(query);
			}
			if (nsa) {
				return (
					nsa.name.toLowerCase().includes(query) || nsa.abbreviation?.toLowerCase().includes(query)
				);
			}
			return false;
		});
	};

	// Get all committee groups
	let committeeGroups = $derived(
		$globalPapersGroupedQuery.data?.findGlobalPapersGroupedByCommittee ?? []
	);

	// Sorting state per agenda item
	let sortConfig = new SvelteMap<string, { key: string; direction: 'asc' | 'desc' }>();

	const getSortedPapers = (agendaItemId: string, papers: any[]) => {
		let result = filterPapersBySearch(papers);

		const config = sortConfig.get(agendaItemId);
		if (config) {
			result.sort((a, b) => {
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
					case 'firstSubmittedAt':
						aVal = a.firstSubmittedAt ? new Date(a.firstSubmittedAt).getTime() : 0;
						bVal = b.firstSubmittedAt ? new Date(b.firstSubmittedAt).getTime() : 0;
						break;
					default:
						return 0;
				}

				if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
				if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
				return 0;
			});
		}

		return result;
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

	// Get total papers count for summary
	let totalPapersCount = $derived.by(() => {
		const committeePapers =
			$globalPapersGroupedQuery.data?.findGlobalPapersGroupedByCommittee?.flatMap((c) =>
				c.agendaItems.flatMap((ai) => ai.papers)
			) ?? [];
		const introPapers = $globalIntroductionPapersQuery.data?.findGlobalIntroductionPapers ?? [];
		return committeePapers.length + introPapers.length;
	});
</script>

<div class="flex flex-col gap-3 w-full">
	<!-- Search Bar -->
	<div class="card bg-base-200 border border-base-300 p-4">
		<div class="flex flex-col sm:flex-row gap-3">
			<!-- Search Input -->
			<label class="input input-bordered flex items-center gap-2 flex-1">
				<i class="fa-solid fa-search text-base-content/50"></i>
				<input
					type="text"
					placeholder={m.searchByDelegation()}
					class="grow"
					bind:value={searchQuery}
				/>
			</label>
		</div>

		<!-- Papers count summary -->
		<div class="text-sm text-base-content/60 mt-2">
			{m.papers()}: {totalPapersCount}
		</div>
	</div>

	{#if $globalPapersGroupedQuery.fetching}
		<div class="flex justify-center p-8">
			<i class="fa-duotone fa-spinner fa-spin text-4xl"></i>
		</div>
	{:else if $globalPapersGroupedQuery.errors?.length}
		<div class="alert alert-error">
			<i class="fa-solid fa-exclamation-triangle"></i>
			<span>{$globalPapersGroupedQuery.errors[0].message}</span>
		</div>
	{:else if committeeGroups.length > 0 || showIntroductionPapers}
		{#each committeeGroups as committeeGroup}
			{@const committeePapersCount = committeeGroup.agendaItems.reduce(
				(sum, ai) => sum + filterPapersBySearch(ai.papers).length,
				0
			)}
			{#if committeePapersCount > 0}
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
							<span class="badge badge-ghost">{committeePapersCount} {m.papers()}</span>
						</div>
					</div>

					<!-- Agenda Items (expanded) -->
					{#if $expandedCommittee === committeeGroup.committee.id}
						<div class="p-4 pt-2">
							{#each committeeGroup.agendaItems as agendaItemGroup, index}
								{@const filteredPapers = filterPapersBySearch(agendaItemGroup.papers)}
								{#if filteredPapers.length > 0}
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
												<div class="flex items-center gap-2">
													<i
														class="fa-solid {$expandedAgendaItem === agendaItemGroup.agendaItem.id
															? 'fa-chevron-down'
															: 'fa-chevron-right'} text-base-content/40 text-sm"
													></i>
													<h4 class="font-medium text-sm">{agendaItemGroup.agendaItem.title}</h4>
												</div>
												<span class="badge badge-ghost badge-sm"
													>{filteredPapers.length} {m.papers()}</span
												>
											</div>
										</div>

										<!-- Papers List (expanded) -->
										{#if $expandedAgendaItem === agendaItemGroup.agendaItem.id}
											<div class="px-4 pb-3 border-t border-base-200">
												<PaperTable
													papers={getSortedPapers(agendaItemGroup.agendaItem.id, filteredPapers)}
													sortable={true}
													sortConfig={getSortConfig(agendaItemGroup.agendaItem.id)}
													onSort={(key) => toggleSort(agendaItemGroup.agendaItem.id, key)}
													showStatus={false}
													showUpdatedAt={false}
													linkPrefix="./paperhub/view/"
												/>
											</div>
										{/if}
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/each}

		<!-- Introduction Papers Section -->
		{#if showIntroductionPapers}
			{@const filteredIntroPapers = filterPapersBySearch(introductionPapers)}
			{#if filteredIntroPapers.length > 0}
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
							<span class="badge badge-ghost">{filteredIntroPapers.length} {m.papers()}</span>
						</div>
					</div>

					{#if $expandedCommittee === 'introduction'}
						<div class="px-4 pb-3 border-t border-base-200">
							<PaperTable
								papers={getSortedPapers('introduction', filteredIntroPapers)}
								sortable={true}
								sortConfig={getSortConfig('introduction')}
								onSort={(key) => toggleSort('introduction', key)}
								showStatus={false}
								showUpdatedAt={false}
								linkPrefix="./paperhub/view/"
							/>
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	{:else}
		<div class="alert alert-info">
			<i class="fa-solid fa-info-circle"></i>
			<span>{m.noPapersSubmittedYet()}</span>
		</div>
	{/if}
</div>
