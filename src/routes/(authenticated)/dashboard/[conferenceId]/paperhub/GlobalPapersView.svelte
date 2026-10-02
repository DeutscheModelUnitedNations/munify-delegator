<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import PaperTable from './PaperTable.svelte';
	import AgendaItemPaperGroup from './AgendaItemPaperGroup.svelte';
	import PaperGroupsState from './PaperGroupsState.svelte';
	import CommitteePaperGroup from './CommitteePaperGroup.svelte';
	import { PaperSortState, sortPapers } from './paperSorting';
	import { ExpandedPaperGroup, PaperGroupsSnapshot } from './paperGroups.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	// Search state
	let searchQuery = $state('');

	const paperSelection = {
		id: true,
		type: true,
		status: true,
		createdAt: true,
		updatedAt: true,
		firstSubmittedAt: true,
		delegation: {
			assignedNation: { alpha2Code: true, alpha3Code: true },
			assignedNonStateActor: { name: true, abbreviation: true, fontAwesomeIcon: true }
		}
	} as const;

	function fetchGrouped() {
		return client.query.findGlobalPapersGroupedByCommittee({
			__args: { conferenceId },
			committee: { id: true, name: true, abbreviation: true },
			agendaItems: {
				agendaItem: { id: true, title: true },
				papers: paperSelection
			}
		});
	}

	function fetchIntroductionPapers() {
		return client.query.findGlobalIntroductionPapers({
			__args: { conferenceId },
			...paperSelection
		});
	}

	type Paper = Awaited<ReturnType<typeof fetchIntroductionPapers>>[number];

	const snapshot = new PaperGroupsSnapshot(() =>
		Promise.all([fetchGrouped(), fetchIntroductionPapers()])
	);

	let introductionPapers = $derived(snapshot.introduction ?? []);
	let committeeGroups = $derived(snapshot.grouped ?? []);

	// Store expanded state in URL params
	const openGroup = new ExpandedPaperGroup();

	// Filter papers by search query (delegation name)
	const filterPapersBySearch = (papers: Paper[]) => {
		const query = searchQuery.toLowerCase().trim();
		if (!query) return papers;

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

	// Sorting state per agenda item; unsorted tables keep the server's order
	const sortState = new PaperSortState();

	let totalPapersCount = $derived(
		committeeGroups.reduce(
			(sum, c) => sum + c.agendaItems.reduce((inner, ai) => inner + ai.papers.length, 0),
			0
		) + introductionPapers.length
	);

	let filteredIntroPapers = $derived(filterPapersBySearch(introductionPapers));
</script>

{#snippet papersTable(groupId: string, papers: Paper[])}
	<div class="px-4 pb-3 border-t border-base-200">
		<PaperTable
			papers={sortPapers(papers, sortState.get(groupId))}
			sortable={true}
			sortConfig={sortState.get(groupId)}
			onSort={(key) => sortState.toggle(groupId, key)}
			showStatus={false}
			showUpdatedAt={false}
			paperHref={(paperId) => resolve(`/dashboard/${conferenceId}/paperhub/view/${paperId}`)}
		/>
	</div>
{/snippet}

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

	<PaperGroupsState
		loading={snapshot.loading}
		error={snapshot.error}
		empty={committeeGroups.length === 0 && introductionPapers.length === 0}
	>
		{#each committeeGroups as committeeGroup (committeeGroup.committee.id)}
			{@const committeePapersCount = committeeGroup.agendaItems.reduce(
				(sum, ai) => sum + filterPapersBySearch(ai.papers).length,
				0
			)}
			{#if committeePapersCount > 0}
				<CommitteePaperGroup committee={committeeGroup.committee} {openGroup}>
					{#snippet aside()}
						<span class="badge badge-ghost">{committeePapersCount} {m.papers()}</span>
					{/snippet}

					<!-- Agenda Items (expanded) -->
					<div class="p-4 pt-2">
						{#each committeeGroup.agendaItems as agendaItemGroup, index (agendaItemGroup.agendaItem.id)}
							{@const agendaItem = agendaItemGroup.agendaItem}
							{@const filteredPapers = filterPapersBySearch(agendaItemGroup.papers)}
							{#if filteredPapers.length > 0}
								<AgendaItemPaperGroup {agendaItem} {index} {openGroup}>
									{#snippet aside()}
										<span class="badge badge-ghost badge-sm"
											>{filteredPapers.length} {m.papers()}</span
										>
									{/snippet}

									<!-- Papers List (expanded) -->
									{@render papersTable(agendaItem.id, filteredPapers)}
								</AgendaItemPaperGroup>
							{/if}
						{/each}
					</div>
				</CommitteePaperGroup>
			{/if}
		{/each}

		<!-- Introduction Papers Section -->
		{#if filteredIntroPapers.length > 0}
			<CommitteePaperGroup {openGroup}>
				{#snippet aside()}
					<span class="badge badge-ghost">{filteredIntroPapers.length} {m.papers()}</span>
				{/snippet}

				{@render papersTable('introduction', filteredIntroPapers)}
			</CommitteePaperGroup>
		{/if}
	</PaperGroupsState>
</div>
