<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { goto } from '$app/navigation';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { getPaperTypeIcon, getPaperStatusIcon } from '$lib/services/enumIcons';
	import { translatePaperType, translatePaperStatus } from '$lib/services/enumTranslations';
	import type { PaperStatus$options, PaperType$options } from '$houdini';

	interface Paper {
		id: string;
		type: PaperType$options;
		status: PaperStatus$options;
		createdAt: string | null;
		updatedAt: string | null;
		firstSubmittedAt: string | null;
		delegation: {
			id: string;
			assignedNation: {
				alpha2Code: string;
				alpha3Code: string;
			} | null;
			assignedNonStateActor: {
				id: string;
				name: string;
				abbreviation: string;
				fontAwesomeIcon: string | null;
			} | null;
		};
	}

	interface SortConfig {
		key: string;
		direction: 'asc' | 'desc';
	}

	interface Props {
		papers: Paper[];
		sortable?: boolean;
		sortConfig?: SortConfig | null;
		onSort?: (key: string) => void;
	}

	let { papers, sortable = false, sortConfig = null, onSort }: Props = $props();

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

	const getSortIcon = (key: string) => {
		if (!sortConfig || sortConfig.key !== key) return 'fa-sort';
		return sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
	};

	const handleSort = (key: string) => {
		if (sortable && onSort) {
			onSort(key);
		}
	};

	const handleRowClick = (e: MouseEvent, paperId: string) => {
		if (e.ctrlKey) {
			open(`./paperhub/${paperId}`, '_blank');
		} else {
			goto(`./paperhub/${paperId}`);
		}
	};

 	const handleRowAuxclick = (e: MouseEvent, paperId: string) => {
		if (e.button === 1) {
			e.preventDefault();
			open(`./paperhub/${paperId}`, '_blank', 'noopener,noreferrer');
		}
	};

	const handleRowKeypress = (e: KeyboardEvent, paperId: string) => {
		if (e.key === 'Enter') {
			goto(`./paperhub/${paperId}`);
		}
	};
</script>

<div class="overflow-x-auto">
	<table class="table table-xs">
		<thead>
			<tr class="text-xs">
				<th
					class={sortable ? 'cursor-pointer hover:bg-base-200/50 select-none' : ''}
					onclick={() => handleSort('country')}
				>
					<div class="flex items-center gap-1">
						{m.country()}
						{#if sortable}
							<i class="fa-solid {getSortIcon('country')} text-xs opacity-50"></i>
						{/if}
					</div>
				</th>
				<th
					class={sortable ? 'cursor-pointer hover:bg-base-200/50 select-none' : ''}
					onclick={() => handleSort('type')}
					title={m.paperType()}
				>
					<div class="flex items-center gap-1">
						<i class="fa-solid fa-file"></i>
						{#if sortable}
							<i class="fa-solid {getSortIcon('type')} text-xs opacity-50"></i>
						{/if}
					</div>
				</th>
				<th
					class={sortable ? 'cursor-pointer hover:bg-base-200/50 select-none' : ''}
					onclick={() => handleSort('status')}
					title={m.status()}
				>
					<div class="flex items-center gap-1">
						<i class="fa-solid fa-circle-info"></i>
						{#if sortable}
							<i class="fa-solid {getSortIcon('status')} text-xs opacity-50"></i>
						{/if}
					</div>
				</th>
				<th
					class={sortable ? 'cursor-pointer hover:bg-base-200/50 select-none' : ''}
					onclick={() => handleSort('firstSubmittedAt')}
					title={m.submittedAt()}
				>
					<div class="flex items-center gap-1">
						<i class="fa-solid fa-paper-plane"></i>
						{#if sortable}
							<i class="fa-solid {getSortIcon('firstSubmittedAt')} text-xs opacity-50"></i>
						{/if}
					</div>
				</th>
				<th
					class={sortable ? 'cursor-pointer hover:bg-base-200/50 select-none' : ''}
					onclick={() => handleSort('updatedAt')}
					title={m.paperUpdatedAt()}
				>
					<div class="flex items-center gap-1">
						<i class="fa-solid fa-clock-rotate-left"></i>
						{#if sortable}
							<i class="fa-solid {getSortIcon('updatedAt')} text-xs opacity-50"></i>
						{/if}
					</div>
				</th>
			</tr>
		</thead>
		<tbody>
			{#each papers as paper}
				<tr
					class="hover:bg-base-200/50 cursor-pointer"
					onclick={(e) => handleRowClick(e, paper.id)}
					onmousedown={(e) => handleRowAuxclick(e, paper.id)}
					role="link"
					tabindex="0"
					onkeypress={(e) => handleRowKeypress(e, paper.id)}
				>
					<td>
						<div class="flex items-center gap-2">
							{#if paper.delegation.assignedNation}
								<Flag size="xs" alpha2Code={paper.delegation.assignedNation.alpha2Code} />
								<span class="truncate max-w-32">
									{getFullTranslatedCountryNameFromISO3Code(
										paper.delegation.assignedNation.alpha3Code
									)}
								</span>
							{:else if paper.delegation.assignedNonStateActor}
								<Flag
									size="xs"
									nsa={true}
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
								class="fa-solid {getPaperTypeIcon(paper.type)} {getTypeColor(paper.type)} text-base"
							></i>
						</div>
					</td>
					<td>
						<div class="tooltip" data-tip={translatePaperStatus(paper.status)}>
							<i
								class="fa-solid {getPaperStatusIcon(paper.status)} {getStatusColor(
									paper.status
								)} text-base"
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
