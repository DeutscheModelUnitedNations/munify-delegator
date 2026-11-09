<script lang="ts">
	import { clickedLink } from '#lib/helpers/clickedLink';
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';
	import { goto } from '$app/navigation';
	import type { ResolvedPathname } from '$app/types';
	import Flag from '#lib/components/Flag.svelte';
	import { splitRole } from '#lib/helpers/conferenceRole';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { getPaperTypeIcon, getPaperStatusIcon } from '#lib/utils/enumIcons';
	import { translatePaperType, translatePaperStatus } from '#lib/utils/enumTranslations';
	import type { PaperstatusEnum, PapertypeEnum } from '#lib/api/rumbleClient/client';
	import type { PaperDelegationRole } from './paperDisplay';
	import type { PaperSortKey, SortConfig } from './paperSorting';

	interface Paper {
		id: string;
		type: PapertypeEnum;
		status: PaperstatusEnum;
		updatedAt: Date | null;
		firstSubmittedAt: Date | null;
		delegation: { assignedRole: PaperDelegationRole | null };
	}

	interface Props {
		papers: Paper[];
		sortable?: boolean;
		sortConfig?: SortConfig | null;
		onSort?: (key: PaperSortKey) => void;
		showStatus?: boolean;
		showUpdatedAt?: boolean;
		/** Where a row leads; already passed through `resolve()`. */
		paperHref: (paperId: string) => ResolvedPathname;
	}

	let {
		papers,
		sortable = false,
		sortConfig = null,
		onSort,
		showStatus = true,
		showUpdatedAt = true,
		paperHref
	}: Props = $props();

	// Type colors for icon badges
	const getTypeColor = (type: PapertypeEnum) => {
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
	const STATUS_COLORS: Record<PaperstatusEnum, string> = {
		DRAFT: 'text-base-content/50',
		SUBMITTED: 'text-warning',
		REVISED: 'text-info',
		CHANGES_REQUESTED: 'text-error',
		ACCEPTED: 'text-success'
	};
	const getStatusColor = (status: PaperstatusEnum) => STATUS_COLORS[status];

	const formatDate = (date: Date | null) => {
		if (!date) return '-';
		return new Date(date).toLocaleDateString(getLocale());
	};

	const getSortIcon = (key: PaperSortKey) => {
		if (!sortConfig || sortConfig.key !== key) return 'fa-sort';
		return sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
	};

	const handleSort = (key: PaperSortKey) => {
		if (sortable && onSort) {
			onSort(key);
		}
	};

	const ariaSort = (key: PaperSortKey) => {
		if (!sortConfig || sortConfig.key !== key) return 'none';
		return sortConfig.direction === 'asc' ? 'ascending' : 'descending';
	};

	// The row is a bigger target for the mouse; keyboard and screen readers use the link in its
	// first cell, which also handles its own clicks
	const handleRowClick = ({ e, paperId }: { e: MouseEvent; paperId: string }) => {
		if (clickedLink(e)) return;
		if (e.ctrlKey || e.metaKey) {
			open(paperHref(paperId), '_blank');
		} else {
			goto(paperHref(paperId));
		}
	};

	const handleRowAuxclick = ({ e, paperId }: { e: MouseEvent; paperId: string }) => {
		if (clickedLink(e)) return;
		if (e.button === 1) {
			e.preventDefault();
			open(paperHref(paperId), '_blank', 'noopener,noreferrer');
		}
	};
</script>

{#snippet sortableHeader(
	key: PaperSortKey,
	label: { text: string } | { icon: string; title: string }
)}
	{#snippet labelContent()}
		{#if 'text' in label}
			{label.text}
		{:else}
			<i class="fa-sharp-duotone fa-solid {label.icon}"></i>
			<span class="sr-only">{label.title}</span>
		{/if}
	{/snippet}
	<th
		class={sortable ? 'hover:bg-base-200/50' : ''}
		title={'title' in label ? label.title : undefined}
		aria-sort={sortable ? ariaSort(key) : undefined}
	>
		{#if sortable}
			<button
				type="button"
				class="flex cursor-pointer items-center gap-1 select-none"
				onclick={() => handleSort(key)}
			>
				{@render labelContent()}
				<i class="fa-sharp-duotone fa-solid {getSortIcon(key)} text-xs opacity-50"></i>
			</button>
		{:else}
			<div class="flex items-center gap-1">{@render labelContent()}</div>
		{/if}
	</th>
{/snippet}

{#snippet delegationCell(delegation: Paper['delegation'])}
	{@const { nation, nonStateActor } = splitRole(delegation.assignedRole)}
	<div class="flex items-center gap-2">
		{#if nation}
			<Flag size="xs" alpha2Code={nation.alpha2Code} />
			<span class="truncate max-w-32">
				{getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)}
			</span>
		{:else if nonStateActor}
			<Flag size="xs" nsa={true} icon={nonStateActor.fontAwesomeIcon} />
			<span class="truncate max-w-32">
				{nonStateActor.name}
			</span>
		{/if}
	</div>
{/snippet}

<div class="overflow-x-auto">
	<table class="table table-sm">
		<thead>
			<tr class="text-xs text-base-content/60">
				{@render sortableHeader('country', { text: m.country() })}
				{@render sortableHeader('type', { text: m.paperType() })}
				{#if showStatus}
					{@render sortableHeader('status', { text: m.status() })}
				{/if}
				{@render sortableHeader('firstSubmittedAt', { text: m.submittedAt() })}
				{#if showUpdatedAt}
					{@render sortableHeader('updatedAt', { text: m.paperUpdatedAt() })}
				{/if}
				<th aria-hidden="true"></th>
			</tr>
		</thead>
		<tbody>
			{#each papers as paper (paper.id)}
				<tr
					class="hover:bg-base-200/50 cursor-pointer"
					onclick={(e) => handleRowClick({ e, paperId: paper.id })}
					onmousedown={(e) => handleRowAuxclick({ e, paperId: paper.id })}
				>
					<td>
						<a href={paperHref(paper.id)} class="link link-hover">
							{@render delegationCell(paper.delegation)}
						</a>
					</td>
					<td>
						<span class="flex items-center gap-2 whitespace-nowrap">
							<i
								class="fa-sharp-duotone fa-solid {getPaperTypeIcon(paper.type)} {getTypeColor(
									paper.type
								)}"
							></i>
							{translatePaperType(paper.type)}
						</span>
					</td>
					{#if showStatus}
						<td>
							<span
								class="flex items-center gap-2 whitespace-nowrap {getStatusColor(paper.status)}"
							>
								<i class="fa-sharp-duotone fa-solid {getPaperStatusIcon(paper.status)}"></i>
								{translatePaperStatus(paper.status)}
							</span>
						</td>
					{/if}
					<td class="text-xs text-base-content/70">
						{formatDate(paper.firstSubmittedAt)}
					</td>
					{#if showUpdatedAt}
						<td class="text-xs text-base-content/70">
							{formatDate(paper.updatedAt)}
						</td>
					{/if}
					<td class="text-right text-base-content/40" aria-hidden="true">
						<i class="fa-sharp-duotone fa-solid fa-chevron-right text-xs"></i>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
