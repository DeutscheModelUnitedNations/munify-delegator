<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { Table } from '$lib/components/tanStackTable';
	import type { ParticipantRow, TextFilterMode } from './types';
	import type { ParticipantTableFeatures } from './tableFeatures';
	import SideDrawer from './SideDrawer.svelte';
	import ColumnCategoryGroups from './ColumnCategoryGroups.svelte';
	import { toggledEnumFilter, updatedRangeFilter } from './filterFns';
	import {
		translateAdministrativeStatus,
		translateParticipationRole,
		translateFoodPreference,
		translateGender,
		translateTeamRole
	} from '$lib/utils/enumTranslations';

	interface Props {
		open: boolean;
		table: Table<ParticipantTableFeatures, ParticipantRow>;
		onResetFilters?: () => void;
	}

	let { open = $bindable(), table, onResetFilters }: Props = $props();

	const enumTranslators: Record<string, (value: string) => string> = {
		role: translateParticipationRole,
		gender: translateGender,
		foodPreference: translateFoodPreference,
		teamRole: translateTeamRole,
		paymentStatus: translateAdministrativeStatus,
		postalRegistrationStatus: translateAdministrativeStatus,
		termsAndConditions: translateAdministrativeStatus,
		guardianConsent: translateAdministrativeStatus,
		mediaConsent: translateAdministrativeStatus,
		committee: (v: string) => v
	};

	function translateEnumValue(columnId: string, value: string): string {
		if (value === '—') return value;
		const translator = enumTranslators[columnId];
		return translator ? translator(value) : value;
	}

	const textFilterModes: { value: TextFilterMode; label: string; needsInput: boolean }[] = [
		{ value: 'contains', label: m.filterContains(), needsInput: true },
		{ value: 'containsNot', label: m.filterContainsNot(), needsInput: true },
		{ value: 'equals', label: m.filterEquals(), needsInput: true },
		{ value: 'equalsNot', label: m.filterEqualsNot(), needsInput: true },
		{ value: 'startsWith', label: m.filterStartsWith(), needsInput: true },
		{ value: 'startsWithNot', label: m.filterStartsWithNot(), needsInput: true },
		{ value: 'isEmpty', label: m.filterIsEmpty(), needsInput: false },
		{ value: 'isNotEmpty', label: m.filterIsNotEmpty(), needsInput: false }
	];

	/** The three states of a yes/no filter; `null` means no filter. */
	const booleanFilterOptions: { value: boolean | null; label: string }[] = [
		{ value: null, label: m.all() },
		{ value: true, label: m.yes() },
		{ value: false, label: m.no() }
	];

	function modeNeedsInput(mode: TextFilterMode): boolean {
		return textFilterModes.find((m) => m.value === mode)?.needsInput ?? true;
	}

	const visibleColumns = $derived(
		table.getAllColumns().flatMap((col) => {
			const meta = col.columnDef.meta;
			return meta && col.getIsVisible() && col.getCanFilter() ? [{ col, meta }] : [];
		})
	);

	type FilterColumn = (typeof visibleColumns)[number]['col'];

	function clearAllFilters() {
		onResetFilters?.();
		table.resetColumnFilters();
	}

	function getTextFilterState(columnId: string): { mode: TextFilterMode; value: string } {
		const col = table.getColumn(columnId);
		const raw = col?.getFilterValue() as { mode: TextFilterMode; value: string } | undefined;
		return raw ?? { mode: 'contains', value: '' };
	}

	function setTextFilter(columnId: string, mode: TextFilterMode, value: string) {
		const col = table.getColumn(columnId);
		if (!col) return;
		if (!modeNeedsInput(mode)) {
			col.setFilterValue({ mode, value: '' });
		} else {
			col.setFilterValue(value ? { mode, value } : undefined);
		}
	}

	function toggleEnumValue(columnId: string, value: string) {
		const col = table.getColumn(columnId);
		if (!col) return;
		col.setFilterValue(toggledEnumFilter(col.getFilterValue() as string[] | undefined, value));
	}

	function setBooleanFilter(columnId: string, value: boolean | null) {
		const col = table.getColumn(columnId);
		if (!col) return;
		col.setFilterValue(value);
	}

	function setRangeFilter(columnId: string, index: 0 | 1, value: string) {
		const col = table.getColumn(columnId);
		if (!col) return;
		const current = col.getFilterValue() as [number | null, number | null] | undefined;
		col.setFilterValue(updatedRangeFilter(current, index, value));
	}
</script>

{#snippet textFilter(col: FilterColumn, header: string)}
	{@const state = getTextFilterState(col.id)}
	<div class="flex gap-1">
		<select
			class="select select-sm select-bordered"
			value={state.mode}
			onchange={(e) => setTextFilter(col.id, e.currentTarget.value as TextFilterMode, state.value)}
		>
			{#each textFilterModes as mode (mode.value)}
				<option value={mode.value}>{mode.label}</option>
			{/each}
		</select>
		{#if modeNeedsInput(state.mode)}
			<input
				type="text"
				class="input input-sm input-bordered grow"
				placeholder={header}
				value={state.value}
				oninput={(e) => setTextFilter(col.id, state.mode, e.currentTarget.value)}
			/>
		{/if}
	</div>
{/snippet}

{#snippet enumFilter(col: FilterColumn)}
	{@const facetedValues = col.getFacetedUniqueValues()}
	{@const currentFilter = (col.getFilterValue() as string[] | undefined) ?? []}
	<div class="flex flex-wrap gap-1">
		{#each [...facetedValues.entries()] as [value, count] (value)}
			{@const filterKey = value == null || value === '' ? '—' : String(value)}
			{@const isSelected = currentFilter.includes(filterKey)}
			<button
				class="badge badge-sm cursor-pointer gap-1"
				class:badge-primary={isSelected}
				class:badge-outline={!isSelected}
				onclick={() => toggleEnumValue(col.id, filterKey)}
			>
				{translateEnumValue(col.id, filterKey)}
				<span class="text-xs opacity-60">({count})</span>
			</button>
		{/each}
	</div>
{/snippet}

{#snippet booleanFilter(col: FilterColumn)}
	{@const currentValue = col.getFilterValue() as boolean | null | undefined}
	<div class="flex gap-1">
		{#each booleanFilterOptions as option (option.label)}
			{@const isSelected = (currentValue ?? null) === option.value}
			<button
				class="badge badge-sm cursor-pointer"
				class:badge-primary={isSelected}
				class:badge-outline={!isSelected}
				onclick={() => setBooleanFilter(col.id, option.value)}
			>
				{option.label}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet rangeFilter(col: FilterColumn)}
	{@const currentRange = (col.getFilterValue() as [number | null, number | null] | undefined) ?? [
		null,
		null
	]}
	{@const facetedMinMax = col.getFacetedMinMaxValues()}
	<div class="flex items-center gap-2">
		<input
			type="number"
			class="input input-sm input-bordered w-20"
			placeholder={facetedMinMax?.[0]?.toString() ?? 'Min'}
			value={currentRange[0] ?? ''}
			oninput={(e) => setRangeFilter(col.id, 0, e.currentTarget.value)}
		/>
		<span class="text-base-content/50">—</span>
		<input
			type="number"
			class="input input-sm input-bordered w-20"
			placeholder={facetedMinMax?.[1]?.toString() ?? 'Max'}
			value={currentRange[1] ?? ''}
			oninput={(e) => setRangeFilter(col.id, 1, e.currentTarget.value)}
		/>
	</div>
{/snippet}

<SideDrawer bind:open title={m.filters()} icon="fa-filter">
	<ColumnCategoryGroups entries={visibleColumns} listClass="flex flex-col gap-3">
		{#snippet item({ col, meta: colMeta }, header)}
			<div class="form-control">
				<div class="label">
					<span class="label-text font-medium">{header}</span>
				</div>

				{#if colMeta.filterType === 'text'}
					{@render textFilter(col, header)}
				{:else if colMeta.filterType === 'enum'}
					{@render enumFilter(col)}
				{:else if colMeta.filterType === 'boolean'}
					{@render booleanFilter(col)}
				{:else if colMeta.filterType === 'range'}
					{@render rangeFilter(col)}
				{/if}
			</div>
		{/snippet}
	</ColumnCategoryGroups>

	{#snippet footer()}
		<button class="btn btn-ghost btn-sm w-full" onclick={clearAllFilters}>
			<i class="fa-duotone fa-filter-circle-xmark"></i>
			{m.clearAllFilters()}
		</button>
	{/snippet}
</SideDrawer>
