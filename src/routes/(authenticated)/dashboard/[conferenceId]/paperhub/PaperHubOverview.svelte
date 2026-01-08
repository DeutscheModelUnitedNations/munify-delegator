<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { goto } from '$app/navigation';
	import { queryParam } from 'sveltekit-search-params';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { getPaperTypeIcon, getPaperStatusIcon } from '$lib/services/enumIcons';
	import { translatePaperType, translatePaperStatus } from '$lib/services/enumTranslations';
	import type { PaperStatus$options, PaperType$options } from '$houdini';

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

	$effect(() => {
		papersGroupedQuery.fetch({ variables: { conferenceId } });
	});

	// Store expanded state in URL params using sveltekit-search-params
	const expandedCommittee = queryParam('committee');
	const expandedAgendaItem = queryParam('topic');

	const toggleCommittee = (committeeId: string) => {
		if ($expandedCommittee === committeeId) {
			$expandedCommittee = null;
			$expandedAgendaItem = null; // Collapse topics when collapsing committee
		} else {
			$expandedCommittee = committeeId;
			$expandedAgendaItem = null; // Reset topic when switching committee
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
	let sortConfig = $state<Map<string, { key: string; direction: 'asc' | 'desc' }>>(new Map());

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
		sortConfig = new Map(sortConfig);
	};

	const getSortIcon = (agendaItemId: string, key: string) => {
		const config = sortConfig.get(agendaItemId);
		if (config?.key !== key) return 'fa-sort';
		return config.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
	};

	// Type colors for icon badges
	const getTypeColor = (type: PaperType$options) => {
		switch (type) {
			case 'POSITION_PAPER':
				return 'text-primary';
			case 'WORKING_PAPER':
			case 'INTRODUCTION_PAPER':
			default:
				return 'text-secondary';
		}
	};

	// Status colors for icon badges
	const getStatusColor = (status: PaperStatus$options) => {
		switch (status) {
			case 'SUBMITTED':
				return 'text-warning';
			case 'CHANGES_REQUESTED':
				return 'text-error';
			case 'ACCEPTED':
				return 'text-success';
			default:
				return 'text-base-content/50';
		}
	};

	const formatDate = (date: string | null) => {
		if (!date) return '-';
		return new Date(date).toLocaleDateString();
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
						<div class="flex items-center gap-2">
							<div class="badge badge-ghost gap-1" title={m.total()}>
								<i class="fa-solid fa-file-lines text-xs"></i>
								{committeeCounts.total}
							</div>
							<div
								class="badge badge-warning badge-outline gap-1"
								title={translatePaperStatus('SUBMITTED')}
							>
								<i class="fa-solid fa-paper-plane text-xs"></i>
								{committeeCounts.SUBMITTED}
							</div>
							<div
								class="badge badge-error badge-outline gap-1"
								title={translatePaperStatus('CHANGES_REQUESTED')}
							>
								<i class="fa-solid fa-exclamation-triangle text-xs"></i>
								{committeeCounts.CHANGES_REQUESTED}
							</div>
							<div
								class="badge badge-success badge-outline gap-1"
								title={translatePaperStatus('ACCEPTED')}
							>
								<i class="fa-solid fa-check-circle text-xs"></i>
								{committeeCounts.ACCEPTED}
							</div>
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
										<div class="flex items-center gap-3">
											<i
												class="fa-solid {$expandedAgendaItem === agendaItemGroup.agendaItem.id
													? 'fa-chevron-down'
													: 'fa-chevron-right'} text-base-content/40 text-sm"
											></i>
											<h4 class="font-medium text-sm">{agendaItemGroup.agendaItem.title}</h4>
										</div>
										<div class="flex items-center gap-1">
											<div class="badge badge-ghost badge-sm gap-1" title={m.total()}>
												<i class="fa-solid fa-file-lines text-xs"></i>
												{agendaCounts.total}
											</div>
											<div
												class="badge badge-warning badge-outline badge-sm gap-1"
												title={translatePaperStatus('SUBMITTED')}
											>
												<i class="fa-solid fa-paper-plane text-xs"></i>
												{agendaCounts.SUBMITTED}
											</div>
											<div
												class="badge badge-error badge-outline badge-sm gap-1"
												title={translatePaperStatus('CHANGES_REQUESTED')}
											>
												<i class="fa-solid fa-exclamation-triangle text-xs"></i>
												{agendaCounts.CHANGES_REQUESTED}
											</div>
											<div
												class="badge badge-success badge-outline badge-sm gap-1"
												title={translatePaperStatus('ACCEPTED')}
											>
												<i class="fa-solid fa-check-circle text-xs"></i>
												{agendaCounts.ACCEPTED}
											</div>
										</div>
									</div>
								</div>

								<!-- Papers List (expanded) -->
								{#if $expandedAgendaItem === agendaItemGroup.agendaItem.id}
									<div class="px-4 pb-3 border-t border-base-200">
										<div class="overflow-x-auto">
											<table class="table table-xs">
												<thead>
													<tr class="text-xs">
														<th
															class="cursor-pointer hover:bg-base-200/50 select-none"
															onclick={() => toggleSort(agendaItemGroup.agendaItem.id, 'country')}
														>
															<div class="flex items-center gap-1">
																{m.country()}
																<i
																	class="fa-solid {getSortIcon(
																		agendaItemGroup.agendaItem.id,
																		'country'
																	)} text-xs opacity-50"
																></i>
															</div>
														</th>
														<th
															class="cursor-pointer hover:bg-base-200/50 select-none"
															onclick={() => toggleSort(agendaItemGroup.agendaItem.id, 'type')}
															title={m.paperType()}
														>
															<div class="flex items-center gap-1">
																<i class="fa-solid fa-file"></i>
																<i
																	class="fa-solid {getSortIcon(
																		agendaItemGroup.agendaItem.id,
																		'type'
																	)} text-xs opacity-50"
																></i>
															</div>
														</th>
														<th
															class="cursor-pointer hover:bg-base-200/50 select-none"
															onclick={() => toggleSort(agendaItemGroup.agendaItem.id, 'status')}
															title={m.status()}
														>
															<div class="flex items-center gap-1">
																<i class="fa-solid fa-circle-info"></i>
																<i
																	class="fa-solid {getSortIcon(
																		agendaItemGroup.agendaItem.id,
																		'status'
																	)} text-xs opacity-50"
																></i>
															</div>
														</th>
														<th
															class="cursor-pointer hover:bg-base-200/50 select-none"
															onclick={() =>
																toggleSort(agendaItemGroup.agendaItem.id, 'firstSubmittedAt')}
															title={m.submittedAt()}
														>
															<div class="flex items-center gap-1">
																<i class="fa-solid fa-paper-plane"></i>
																<i
																	class="fa-solid {getSortIcon(
																		agendaItemGroup.agendaItem.id,
																		'firstSubmittedAt'
																	)} text-xs opacity-50"
																></i>
															</div>
														</th>
														<th
															class="cursor-pointer hover:bg-base-200/50 select-none"
															onclick={() => toggleSort(agendaItemGroup.agendaItem.id, 'updatedAt')}
															title={m.paperUpdatedAt()}
														>
															<div class="flex items-center gap-1">
																<i class="fa-solid fa-clock-rotate-left"></i>
																<i
																	class="fa-solid {getSortIcon(
																		agendaItemGroup.agendaItem.id,
																		'updatedAt'
																	)} text-xs opacity-50"
																></i>
															</div>
														</th>
													</tr>
												</thead>
												<tbody>
													{#each getSortedPapers(agendaItemGroup.agendaItem.id, agendaItemGroup.papers) as paper}
														<tr
															class="hover:bg-base-200/50 cursor-pointer"
															onclick={() => goto(`./paperhub/${paper.id}`)}
															role="link"
															tabindex="0"
															onkeypress={(e) =>
																e.key === 'Enter' && goto(`./paperhub/${paper.id}`)}
														>
															<td>
																<div class="flex items-center gap-2">
																	{#if paper.delegation.assignedNation}
																		<Flag
																			size="xs"
																			alpha2Code={paper.delegation.assignedNation.alpha2Code}
																		/>
																		<span class="truncate max-w-32">
																			{getFullTranslatedCountryNameFromISO3Code(
																				paper.delegation.assignedNation.alpha3Code
																			)}
																		</span>
																	{:else if paper.delegation.assignedNonStateActor}
																		<Flag
																			size="xs"
																			nsa={paper.delegation.assignedNonStateActor}
																			icon={paper.delegation.assignedNonStateActor.fontAwesomeIcon}
																		/>
																		<span class="truncate max-w-32">
																			{paper.delegation.assignedNonStateActor.name}
																		</span>
																	{/if}
																</div>
															</td>
															<td>
																<div class="tooltip" data-tip={translatePaperType(paper.type)}>
																	<i
																		class="fa-solid {getPaperTypeIcon(paper.type)} {getTypeColor(
																			paper.type
																		)} text-base"
																	></i>
																</div>
															</td>
															<td>
																<div class="tooltip" data-tip={translatePaperStatus(paper.status)}>
																	<i
																		class="fa-solid {getPaperStatusIcon(
																			paper.status
																		)} {getStatusColor(paper.status)} text-base"
																	></i>
																</div>
															</td>
															<td class="text-xs text-base-content/70">
																{formatDate(paper.firstSubmittedAt)}
															</td>
															<td class="text-xs text-base-content/70">
																{formatDate(paper.updatedAt)}
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	{:else}
		<div class="alert alert-info">
			<i class="fa-solid fa-info-circle"></i>
			<span>{m.noPapersSubmittedYet()}</span>
		</div>
	{/if}
</div>
