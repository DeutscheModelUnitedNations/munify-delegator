<script lang="ts">
	import { createFuzzySearch } from '$lib/components/tanStackTable/search';
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import PaperMatrix from './PaperMatrix.svelte';
	import PaperGroupsState from './PaperGroupsState.svelte';
	import { createPaperGroupsSnapshot } from './paperGroups.svelte';
	import Flag from '$lib/components/Flag.svelte';
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
			id: true,
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

	const snapshot = createPaperGroupsSnapshot(() =>
		Promise.all([fetchGrouped(), fetchIntroductionPapers()])
	);

	let introductionPapers = $derived(snapshot.introduction ?? []);
	let committeeGroups = $derived(snapshot.grouped ?? []);

	/** What a paper is searched by: the name of the nation or non-state actor of its delegation */
	const roleText = ({ delegation }: Paper) =>
		delegation.assignedNation
			? getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation.alpha3Code)
			: [delegation.assignedNonStateActor?.name, delegation.assignedNonStateActor?.abbreviation]
					.filter(Boolean)
					.join(' ');

	// Filter papers by search query (delegation name), keeping the order of the papers
	const filterPapersBySearch = (papers: Paper[]) => {
		const hits = new Set(createFuzzySearch(papers, roleText)(searchQuery));
		return papers.filter((paper) => hits.has(paper));
	};

	let totalPapersCount = $derived(
		committeeGroups.reduce(
			(sum, c) => sum + c.agendaItems.reduce((inner, ai) => inner + ai.papers.length, 0),
			0
		) + introductionPapers.length
	);

	const paperHref = (paperId: string) =>
		resolve(`/dashboard/${conferenceId}/paperhub/view/${paperId}`);

	/** The committees that still have a paper after searching, as matrix columns. */
	let visibleCommittees = $derived(
		committeeGroups
			.map(({ committee, agendaItems }) => {
				const columns = agendaItems.map(({ agendaItem, papers }) => ({
					id: agendaItem.id,
					title: agendaItem.title,
					papers: filterPapersBySearch(papers)
				}));
				return {
					committee,
					columns,
					count: columns.reduce((sum, column) => sum + column.papers.length, 0)
				};
			})
			.filter(({ count }) => count > 0)
	);

	let filteredIntroPapers = $derived(filterPapersBySearch(introductionPapers));
</script>

<div class="flex flex-col gap-3 w-full">
	<div class="card bg-base-200 border border-base-300 p-4">
		<label class="input input-bordered flex items-center gap-2 w-full">
			<i class="fa-sharp-duotone fa-solid fa-search text-base-content/50"></i>
			<input
				type="text"
				placeholder={m.searchByDelegation()}
				class="grow"
				bind:value={searchQuery}
			/>
		</label>

		<div class="text-sm text-base-content/60 mt-2">
			{m.papers()}: {totalPapersCount}
		</div>
	</div>

	<PaperGroupsState
		loading={snapshot.loading}
		error={snapshot.error}
		empty={committeeGroups.length === 0 && introductionPapers.length === 0}
	>
		{#each visibleCommittees as { committee, columns, count } (committee.id)}
			<section class="card bg-base-100 border border-base-300">
				<header class="flex items-center justify-between gap-2 p-4 pb-2">
					<div class="flex items-center gap-2">
						<span class="badge badge-primary font-bold">{committee.abbreviation}</span>
						<h3 class="text-lg font-semibold">{committee.name}</h3>
					</div>
					<span class="badge badge-ghost">{count} {m.papers()}</span>
				</header>
				<div class="px-2 pb-2">
					<PaperMatrix {columns} {paperHref} />
				</div>
			</section>
		{/each}

		{#if filteredIntroPapers.length > 0}
			<section class="card bg-base-100 border border-base-300">
				<header class="flex items-center justify-between gap-2 p-4 pb-2">
					<div class="flex items-center gap-2">
						<span class="badge badge-secondary font-bold">{m.nonStateActorAbbreviation()}</span>
						<h3 class="text-lg font-semibold">{m.paperTypeIntroductionPapers()}</h3>
					</div>
					<span class="badge badge-ghost">{filteredIntroPapers.length} {m.papers()}</span>
				</header>
				<div class="flex flex-wrap gap-2 p-4 pt-2">
					{#each filteredIntroPapers as paper (paper.id)}
						<a href={paperHref(paper.id)} class="btn btn-ghost btn-sm border border-base-300 gap-2">
							{#if paper.delegation.assignedNation}
								<Flag size="xs" alpha2Code={paper.delegation.assignedNation.alpha2Code} />
							{:else if paper.delegation.assignedNonStateActor}
								<Flag
									size="xs"
									nsa={true}
									icon={paper.delegation.assignedNonStateActor.fontAwesomeIcon}
								/>
							{/if}
							<span>{roleText(paper)}</span>
						</a>
					{/each}
				</div>
			</section>
		{/if}
	</PaperGroupsState>
</div>
