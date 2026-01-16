<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { queryParam } from 'sveltekit-search-params';
	import type { PaperStatus$options } from '$houdini';
	import PaperStatusBadges from './PaperStatusBadges.svelte';
	import PaperTable from './PaperTable.svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { FlagCollectionSection } from '$lib/components/FlagCollection';
	import ReviewerLeaderboard from '$lib/components/PaperHub/ReviewerLeaderboard.svelte';
	import { persisted } from 'svelte-persisted-store';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	// Focus mode state - limits papers to 5 oldest without reviews (persisted to localStorage)
	let focusMode = persisted('paperHubFocusMode', false);

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
						reviewHelpStatus
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
						versions {
							reviews {
								id
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
				versions {
					reviews {
						id
					}
				}
			}
		}
	`);

	const myReviewStatsQuery = graphql(`
		query MyReviewStatsQuery($conferenceId: String!) {
			myReviewStats(conferenceId: $conferenceId) {
				firstReviews
				followUpReviews
				totalReviews
			}
		}
	`);

	const setReviewHelpStatusMutation = graphql(`
		mutation SetReviewHelpStatus($agendaItemId: String!, $status: ReviewHelpStatus!) {
			setAgendaItemReviewHelpStatus(agendaItemId: $agendaItemId, status: $status) {
				id
				reviewHelpStatus
			}
		}
	`);

	$effect(() => {
		papersGroupedQuery.fetch({ variables: { conferenceId } });
		introductionPapersQuery.fetch({ variables: { conferenceId } });
		myReviewStatsQuery.fetch({ variables: { conferenceId } });
	});

	// User is a reviewer if myReviewStats returns data (not null/undefined)
	let isReviewer = $derived($myReviewStatsQuery.data?.myReviewStats != null);

	// Cycle through review help status values
	const cycleReviewHelpStatus = async (
		agendaItemId: string,
		currentStatus: 'UNSPECIFIED' | 'HELP_NEEDED' | 'NO_HELP_WANTED'
	) => {
		const nextStatus =
			currentStatus === 'UNSPECIFIED'
				? 'HELP_NEEDED'
				: currentStatus === 'HELP_NEEDED'
					? 'NO_HELP_WANTED'
					: 'UNSPECIFIED';

		await setReviewHelpStatusMutation.mutate({
			agendaItemId,
			status: nextStatus
		});
	};

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
		const counts = { total: papers.length, SUBMITTED: 0, REVISED: 0, CHANGES_REQUESTED: 0, ACCEPTED: 0 };
		for (const paper of papers) {
			if (paper.status in counts) {
				counts[paper.status as keyof typeof counts]++;
			}
		}
		return counts;
	};

	// Overall status counts for the distribution chart
	let overallStatusCounts = $derived.by(() => {
		const committeePapers =
			$papersGroupedQuery.data?.findPapersGroupedByCommittee?.flatMap((c) =>
				c.agendaItems.flatMap((ai) => ai.papers)
			) ?? [];
		const introPapers = $introductionPapersQuery.data?.findIntroductionPapers ?? [];
		const allPapers = [...committeePapers, ...introPapers];

		return {
			submitted: allPapers.filter((p) => p.status === 'SUBMITTED').length,
			revised: allPapers.filter((p) => p.status === 'REVISED').length,
			changesRequested: allPapers.filter((p) => p.status === 'CHANGES_REQUESTED').length,
			accepted: allPapers.filter((p) => p.status === 'ACCEPTED').length,
			total: allPapers.length
		};
	});

	// Helper to check if a paper has any reviews
	const paperHasReviews = (paper: any): boolean => {
		return paper.versions?.some((v: any) => v.reviews?.length > 0) ?? false;
	};

	// Sorting state per agenda item
	let sortConfig = new SvelteMap<string, { key: string; direction: 'asc' | 'desc' }>();

	const getSortedPapers = (agendaItemId: string, papers: any[]) => {
		let result = [...papers];

		// Apply user's sort config if set
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
		}

		// Apply focus mode: prioritize papers without reviews, then oldest first, limit to 5
		if ($focusMode) {
			result.sort((a, b) => {
				const aHasReviews = paperHasReviews(a);
				const bHasReviews = paperHasReviews(b);

				// Papers without reviews come first
				if (aHasReviews !== bHasReviews) return aHasReviews ? 1 : -1;

				// Then sort by firstSubmittedAt (oldest first)
				const aTime = a.firstSubmittedAt ? new Date(a.firstSubmittedAt).getTime() : 0;
				const bTime = b.firstSubmittedAt ? new Date(b.firstSubmittedAt).getTime() : 0;
				return aTime - bTime;
			});
			result = result.slice(0, 5);
		}

		return result;
	};

	// Get total papers count for an agenda item (used to show "X of Y" in focus mode)
	const getTotalPapersCount = (papers: any[]) => papers.length;

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
	<!-- Focus Mode Toggle and Status Overview -->
	{#if !$papersGroupedQuery.fetching && $papersGroupedQuery.data?.findPapersGroupedByCommittee?.length}
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

				<!-- Status Distribution Chart -->
				{#if overallStatusCounts.total > 0}
					<div class="border-t border-base-300 pt-4">
						<h4 class="text-sm font-semibold mb-2">{m.paperStatusOverview()}</h4>
						<div class="flex h-12 w-full rounded-lg overflow-hidden">
							{#if overallStatusCounts.submitted > 0}
								<div
									class="tooltip tooltip-right tooltip-warning bg-warning flex items-center justify-center gap-2 text-warning-content transition-all"
									style="width: {(overallStatusCounts.submitted / overallStatusCounts.total) *
										100}%"
									data-tip="{m.paperStatusSubmitted()}: {overallStatusCounts.submitted}"
								>
									<i class="fa-solid fa-paper-plane"></i>
									<span
										class="text-sm font-medium"
										class:blur-sm={$focusMode}
										class:select-none={$focusMode}>{overallStatusCounts.submitted}</span
									>
								</div>
							{/if}
							{#if overallStatusCounts.revised > 0}
								<div
									class="tooltip tooltip-right tooltip-info bg-info flex items-center justify-center gap-2 text-info-content transition-all"
									style="width: {(overallStatusCounts.revised / overallStatusCounts.total) *
										100}%"
									data-tip="{m.paperStatusRevised()}: {overallStatusCounts.revised}"
								>
									<i class="fa-solid fa-rotate"></i>
									<span
										class="text-sm font-medium"
										class:blur-sm={$focusMode}
										class:select-none={$focusMode}>{overallStatusCounts.revised}</span
									>
								</div>
							{/if}
							{#if overallStatusCounts.changesRequested > 0}
								<div
									class="tooltip tooltip-left tooltip-error bg-error flex items-center justify-center gap-2 text-accent-content transition-all"
									style="width: {(overallStatusCounts.changesRequested /
										overallStatusCounts.total) *
										100}%"
									data-tip="{m.paperStatusChangesRequested()}: {overallStatusCounts.changesRequested}"
								>
									<i class="fa-solid fa-rotate-left"></i>
									<span
										class="text-sm font-medium"
										class:blur-sm={$focusMode}
										class:select-none={$focusMode}>{overallStatusCounts.changesRequested}</span
									>
								</div>
							{/if}
							{#if overallStatusCounts.accepted > 0}
								<div
									class="tooltip tooltip-left tooltip-success bg-success flex items-center justify-center gap-2 text-success-content transition-all"
									style="width: {(overallStatusCounts.accepted / overallStatusCounts.total) * 100}%"
									data-tip="{m.paperStatusAccepted()}: {overallStatusCounts.accepted}"
								>
									<i class="fa-solid fa-check"></i>
									<span
										class="text-sm font-medium"
										class:blur-sm={$focusMode}
										class:select-none={$focusMode}>{overallStatusCounts.accepted}</span
									>
								</div>
							{/if}
						</div>
						<!-- Legend -->
						<div class="flex gap-4 text-sm text-base-content/70 mt-2">
							<span class="flex items-center gap-1">
								<span class="inline-block w-3 h-3 bg-warning rounded"></span>
								{m.paperStatusSubmitted()}
							</span>
							<span class="flex items-center gap-1">
								<span class="inline-block w-3 h-3 bg-info rounded"></span>
								{m.paperStatusRevised()}
							</span>
							<span class="flex items-center gap-1">
								<span class="inline-block w-3 h-3 bg-error rounded"></span>
								{m.paperStatusChangesRequested()}
							</span>
							<span class="flex items-center gap-1">
								<span class="inline-block w-3 h-3 bg-success rounded"></span>
								{m.paperStatusAccepted()}
							</span>
						</div>
					</div>
				{/if}

				<!-- Personal Review Stats -->
				{#if $myReviewStatsQuery.data?.myReviewStats}
					{@const myStats = $myReviewStatsQuery.data.myReviewStats}
					<div class="border-t border-base-300 pt-4">
						<h4 class="text-sm font-semibold mb-2">{m.yourReviewStats()}</h4>
						<div class="flex items-center gap-6">
							<span class="flex items-center gap-2">
								<i class="fa-solid fa-star text-primary"></i>
								<span class="text-sm">{m.firstReviews()}:</span>
								<span class="font-bold">{myStats.firstReviews}</span>
							</span>
							<span class="flex items-center gap-2">
								<i class="fa-solid fa-plus text-accent"></i>
								<span class="text-sm">{m.followUpReviews()}:</span>
								<span class="font-bold">{myStats.followUpReviews}</span>
							</span>
							<span class="flex items-center gap-2 text-base-content/60">
								<i class="fa-solid fa-equals"></i>
								<span class="text-sm">{m.totalReviews()}:</span>
								<span class="font-bold">{myStats.totalReviews}</span>
							</span>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Snippets Section -->
		{#if isReviewer}
			<div class="card bg-base-200 border border-base-300 p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<i class="fa-solid fa-bookmark text-primary text-xl"></i>
						<div>
							<h3 class="font-semibold">{m.reviewerSnippets()}</h3>
							<p class="text-sm text-base-content/60">{m.reviewerSnippetsShortDescription()}</p>
						</div>
					</div>
					<a href="./paperhub/snippets" class="btn btn-ghost btn-sm">
						<i class="fa-solid fa-gear"></i>
						{m.manageSnippets()}
					</a>
				</div>
			</div>
		{/if}
	{/if}

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
			{@const helpNeededCount = committeeGroup.agendaItems.filter(
				(ai) => ai.agendaItem.reviewHelpStatus === 'HELP_NEEDED'
			).length}
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
							<PaperStatusBadges counts={committeeCounts} blur={$focusMode} />
						</div>
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
										<div class="flex items-center gap-2">
											<i
												class="fa-solid {$expandedAgendaItem === agendaItemGroup.agendaItem.id
													? 'fa-chevron-down'
													: 'fa-chevron-right'} text-base-content/40 text-sm"
											></i>
											<!-- Review Help Status Toggle -->
											<div
												class="tooltip tooltip-right {agendaItemGroup.agendaItem
													.reviewHelpStatus === 'HELP_NEEDED'
													? 'tooltip-warning'
													: agendaItemGroup.agendaItem.reviewHelpStatus === 'NO_HELP_WANTED'
														? 'tooltip-success'
														: ''}"
												data-tip={agendaItemGroup.agendaItem.reviewHelpStatus === 'HELP_NEEDED'
													? m.reviewHelpNeeded()
													: agendaItemGroup.agendaItem.reviewHelpStatus === 'NO_HELP_WANTED'
														? m.reviewHelpNotWanted()
														: m.reviewHelpStatusTooltip()}
											>
												<button
													class="btn btn-ghost btn-sm btn-square"
													disabled={!isReviewer}
													onclick={(e) => {
														e.stopPropagation();
														cycleReviewHelpStatus(
															agendaItemGroup.agendaItem.id,
															agendaItemGroup.agendaItem.reviewHelpStatus
														);
													}}
												>
													{#if agendaItemGroup.agendaItem.reviewHelpStatus === 'HELP_NEEDED'}
														<i class="fa-solid fa-hand text-warning text-base"></i>
													{:else if agendaItemGroup.agendaItem.reviewHelpStatus === 'NO_HELP_WANTED'}
														<i class="fa-solid fa-check-circle text-success text-base"></i>
													{:else}
														<i class="fa-solid fa-question-circle text-base-content/30 text-base"
														></i>
													{/if}
												</button>
											</div>
											<h4 class="font-medium text-sm">{agendaItemGroup.agendaItem.title}</h4>
										</div>
										<PaperStatusBadges counts={agendaCounts} size="small" blur={$focusMode} />
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
						<PaperStatusBadges counts={introCounts} blur={$focusMode} />
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

	<!-- Flag Collection Gamification Section -->
	<div class="mt-6">
		<FlagCollectionSection {conferenceId} />
	</div>

	<!-- Reviewer Leaderboard -->
	<div class="mt-3">
		<ReviewerLeaderboard {conferenceId} />
	</div>
</div>
