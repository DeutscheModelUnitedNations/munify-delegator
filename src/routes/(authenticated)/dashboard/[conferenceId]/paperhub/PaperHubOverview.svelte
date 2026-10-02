<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import type { PaperstatusEnum, ReviewhelpstatusEnum } from '$lib/api/rumbleClient/client';
	import PaperStatusBadges from './PaperStatusBadges.svelte';
	import PaperStatusDistribution from './PaperStatusDistribution.svelte';
	import PaperTable from './PaperTable.svelte';
	import AgendaItemPaperGroup from './AgendaItemPaperGroup.svelte';
	import PaperGroupsState from './PaperGroupsState.svelte';
	import CommitteePaperGroup from './CommitteePaperGroup.svelte';
	import ReviewHelpStatusToggle from './ReviewHelpStatusToggle.svelte';
	import MyReviewStats from './MyReviewStats.svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { FlagCollectionSection } from '$lib/components/flagCollection';
	import ReviewerLeaderboard from '$lib/components/paperHub/ReviewerLeaderboard.svelte';
	import { persisted } from 'svelte-persisted-store';
	import DetailedPaperStats from '$lib/components/paperHub/DetailedPaperStats.svelte';
	import { PaperSortState, paperHasReviews, sortPapers } from './paperSorting';
	import { ExpandedPaperGroup, PaperGroupsSnapshot } from './paperGroups.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	// Focus mode state - limits papers to 5 oldest without reviews (persisted to localStorage)
	let focusMode = persisted('paperHubFocusMode', false);

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
			assignedNonStateActor: { name: true, fontAwesomeIcon: true }
		},
		versions: { reviews: { id: true } }
	} as const;

	function fetchIntroductionPapers() {
		return client.query.findIntroductionPapers({
			__args: { conferenceId },
			...paperSelection
		});
	}

	function fetchGroupedPapers() {
		return client.query.findPapersGroupedByCommittee({
			__args: { conferenceId },
			committee: { id: true, name: true, abbreviation: true },
			agendaItems: {
				agendaItem: { id: true, title: true, reviewHelpStatus: true },
				papers: paperSelection
			}
		});
	}

	type Paper = Awaited<ReturnType<typeof fetchIntroductionPapers>>[number];

	const snapshot = new PaperGroupsSnapshot(() =>
		Promise.all([fetchGroupedPapers(), fetchIntroductionPapers()])
	);
	let groupedPapers = $derived(snapshot.grouped);
	let introductionPapers = $derived(snapshot.introduction ?? []);
	let papersLoading = $derived(snapshot.loading);

	// Help status set in this session, over the loaded snapshot - so cycling it does not refetch
	// every paper of the conference.
	const helpStatusOverrides = new SvelteMap<string, ReviewhelpstatusEnum>();

	const helpStatusOf = (agendaItem: { id: string; reviewHelpStatus: ReviewhelpstatusEnum }) =>
		helpStatusOverrides.get(agendaItem.id) ?? agendaItem.reviewHelpStatus;

	// Cycle through review help status values
	const cycleReviewHelpStatus = async (
		agendaItemId: string,
		currentStatus: ReviewhelpstatusEnum
	) => {
		const nextStatus =
			currentStatus === 'UNSPECIFIED'
				? 'HELP_NEEDED'
				: currentStatus === 'HELP_NEEDED'
					? 'NO_HELP_WANTED'
					: 'UNSPECIFIED';

		const updated = await client.mutate.setAgendaItemReviewHelpStatus({
			__args: { agendaItemId, status: nextStatus },
			id: true,
			reviewHelpStatus: true
		});
		helpStatusOverrides.set(updated.id, updated.reviewHelpStatus);
	};

	// Store expanded state in URL params using sveltekit-search-params
	const openGroup = new ExpandedPaperGroup();

	// Status counting helper
	const countByStatus = (papers: { status: PaperstatusEnum }[]) => ({
		total: papers.length,
		SUBMITTED: papers.filter((p) => p.status === 'SUBMITTED').length,
		REVISED: papers.filter((p) => p.status === 'REVISED').length,
		CHANGES_REQUESTED: papers.filter((p) => p.status === 'CHANGES_REQUESTED').length,
		ACCEPTED: papers.filter((p) => p.status === 'ACCEPTED').length
	});

	// All papers combined (for statistics)
	let allPapers = $derived([
		...(groupedPapers ?? []).flatMap((c) => c.agendaItems.flatMap((ai) => ai.papers)),
		...introductionPapers
	]);

	// Overall status counts for the distribution chart
	let overallStatusCounts = $derived.by(() => {
		const counts = countByStatus(allPapers);
		return {
			submitted: counts.SUBMITTED,
			revised: counts.REVISED,
			changesRequested: counts.CHANGES_REQUESTED,
			accepted: counts.ACCEPTED,
			total: counts.total
		};
	});

	// Committees with their papers (for detailed stats chart)
	let committeesWithPapers = $derived.by(() => {
		const committees = (groupedPapers ?? []).map((c) => ({
			name: c.committee.name,
			abbreviation: c.committee.abbreviation,
			papers: c.agendaItems.flatMap((ai) => ai.papers)
		}));

		// Add introduction papers as a pseudo-committee (NSA)
		if (introductionPapers.length > 0) {
			committees.push({
				name: m.paperTypeIntroductionPapers(),
				abbreviation: m.nonStateActorAbbreviation(),
				papers: introductionPapers
			});
		}

		return committees;
	});

	// Sorting state per agenda item
	const sortState = new PaperSortState();

	const timeOf = (date: Date | null) => (date ? new Date(date).getTime() : 0);

	const getSortedPapers = (agendaItemId: string, papers: Paper[]) => {
		const config = sortState.get(agendaItemId);
		// Default sort: updatedAt ascending (oldest paper on top)
		let result = sortPapers(papers, config ?? { key: 'updatedAt', direction: 'asc' });

		// Apply focus mode: prioritize papers without reviews, then oldest first, limit to 5
		if ($focusMode) {
			result.sort((a, b) => {
				const aHasReviews = paperHasReviews(a);
				const bHasReviews = paperHasReviews(b);

				// Papers without reviews come first
				if (aHasReviews !== bHasReviews) return aHasReviews ? 1 : -1;

				// Then sort by firstSubmittedAt (oldest first)
				return timeOf(a.firstSubmittedAt) - timeOf(b.firstSubmittedAt);
			});
			result = result.slice(0, 5);
		}

		return result;
	};

	// Calculate review progress percentage (papers that have received at least one review)
	const getReviewProgress = (papers: Paper[]) => {
		if (papers.length === 0) return 0;
		const reviewed = papers.filter((p) => paperHasReviews(p)).length;
		return Math.round((reviewed / papers.length) * 100);
	};
</script>

<!-- Status counts and review progress of a group; `xs` for the smaller agenda item rows -->
{#snippet statusSummary(papers: Paper[], size: 'sm' | 'xs')}
	<PaperStatusBadges
		counts={countByStatus(papers)}
		size={size === 'xs' ? 'small' : 'default'}
		blur={$focusMode}
	/>
	<div class="tooltip tooltip-left" data-tip={m.reviewProgressTooltip()}>
		<span
			class="{size === 'sm' ? 'text-sm' : 'text-xs'} text-base-content/60 ml-2"
			class:blur-sm={$focusMode}
		>
			{getReviewProgress(papers)}%
		</span>
	</div>
{/snippet}

{#snippet papersTable(groupId: string, papers: Paper[])}
	<div class="px-4 pb-3 border-t border-base-200">
		<PaperTable
			papers={getSortedPapers(groupId, papers)}
			sortable={true}
			sortConfig={sortState.get(groupId)}
			onSort={(key) => sortState.toggle(groupId, key)}
			paperHref={(paperId) => resolve(`/dashboard/${conferenceId}/paperhub/${paperId}`)}
		/>
	</div>
{/snippet}

<div class="flex flex-col gap-3 w-full">
	<!-- Focus Mode Toggle and Status Overview -->
	{#if !papersLoading && groupedPapers?.length}
		<div class="card bg-base-200 border border-base-300 p-4">
			<div class="flex flex-col gap-4">
				<!-- Focus Mode Toggle -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<i class="fa-solid fa-bullseye text-primary text-xl"></i>
						<div>
							<h3 class="font-semibold">{m.focusModeLabel()}</h3>
							<p class="text-sm text-base-content/60">{m.focusModeDescription()}</p>
						</div>
					</div>
					<input type="checkbox" class="toggle toggle-primary" bind:checked={$focusMode} />
				</div>

				<PaperStatusDistribution counts={overallStatusCounts} blur={$focusMode} />

				<MyReviewStats {conferenceId} />
			</div>
		</div>

		<!-- Snippets Section -->
		<div class="card bg-base-200 border border-base-300 p-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<i class="fa-solid fa-bookmark text-primary text-xl"></i>
					<div>
						<h3 class="font-semibold">{m.reviewerSnippets()}</h3>
						<p class="text-sm text-base-content/60">{m.reviewerSnippetsShortDescription()}</p>
					</div>
				</div>
				<a
					href={resolve(`/dashboard/${conferenceId}/paperhub/snippets`)}
					class="btn btn-ghost btn-sm"
				>
					<i class="fa-solid fa-gear"></i>
					{m.manageSnippets()}
				</a>
			</div>
		</div>
	{/if}

	<PaperGroupsState loading={papersLoading} error={snapshot.error} empty={!groupedPapers?.length}>
		{#each groupedPapers ?? [] as committeeGroup (committeeGroup.committee.id)}
			{@const committeePapers = committeeGroup.agendaItems.flatMap((ai) => ai.papers)}
			{@const helpNeededCount = committeeGroup.agendaItems.filter(
				(ai) => helpStatusOf(ai.agendaItem) === 'HELP_NEEDED'
			).length}
			<CommitteePaperGroup committee={committeeGroup.committee} {openGroup}>
				{#snippet aside()}
					<div class="flex items-center gap-2">
						{#if helpNeededCount > 0}
							<div
								class="tooltip tooltip-warning tooltip-left"
								data-tip={m.topicsNeedHelp({ count: helpNeededCount })}
							>
								<div class="badge badge-warning gap-1">
									<i class="fa-solid fa-hand"></i>
									{helpNeededCount}
								</div>
							</div>
						{/if}
						{@render statusSummary(committeePapers, 'sm')}
					</div>
				{/snippet}

				<!-- Agenda Items (expanded) -->
				<div class="p-4 pt-2">
					{#each committeeGroup.agendaItems as agendaItemGroup, index (agendaItemGroup.agendaItem.id)}
						{@const agendaItem = agendaItemGroup.agendaItem}
						{@const helpStatus = helpStatusOf(agendaItem)}
						<AgendaItemPaperGroup {agendaItem} {index} {openGroup}>
							{#snippet leading()}
								<!-- Review Help Status Toggle -->
								<ReviewHelpStatusToggle
									status={helpStatus}
									onCycle={() => cycleReviewHelpStatus(agendaItem.id, helpStatus)}
								/>
							{/snippet}
							{#snippet aside()}
								<div class="flex items-center gap-2">
									{@render statusSummary(agendaItemGroup.papers, 'xs')}
								</div>
							{/snippet}

							{@render papersTable(agendaItem.id, agendaItemGroup.papers)}
						</AgendaItemPaperGroup>
					{/each}
				</div>
			</CommitteePaperGroup>
		{/each}

		<!-- Introduction Papers Section (NSA papers without agenda items) -->
		{#if introductionPapers.length > 0}
			<CommitteePaperGroup {openGroup}>
				{#snippet aside()}
					<div class="flex items-center gap-2">
						{@render statusSummary(introductionPapers, 'sm')}
					</div>
				{/snippet}

				{@render papersTable('introduction', introductionPapers)}
			</CommitteePaperGroup>
		{/if}
	</PaperGroupsState>

	<!-- Flag Collection Gamification Section -->
	<div class="mt-6">
		<FlagCollectionSection {conferenceId} />
	</div>

	<!-- Reviewer Leaderboard -->
	<div class="mt-3">
		<ReviewerLeaderboard {conferenceId} />
	</div>

	<!-- Detailed Paper Statistics Section -->
	{#if !papersLoading && allPapers.length > 0}
		<div class="mt-6">
			<DetailedPaperStats {allPapers} {committeesWithPapers} />
		</div>
	{/if}
</div>
