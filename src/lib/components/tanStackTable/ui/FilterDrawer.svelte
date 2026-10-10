<script lang="ts" generics="TData extends object">
	import { m } from '$lib/paraglide/messages';
	import type { Table } from '$lib/components/tanStackTable';
	import {
		type ManagedColumn,
		type ManagedTableFeatures
	} from '$lib/components/tanStackTable/managedTable';
	import {
		toggledEnumFilter,
		updatedRangeFilter,
		type TextFilterMode
	} from '$lib/components/tanStackTable/filters';
	import { filterEntries } from '$lib/components/tanStackTable/columnEntries';
	import SideDrawer from './SideDrawer.svelte';
	import ColumnGroups from './ColumnGroups.svelte';

	interface Props {
		open: boolean;
		table: Table<ManagedTableFeatures, TData>;
		columns: ManagedColumn<TData>[];
		groupOrder?: string[];
		/** What "clear all filters" does; it clears the table's filters where left out */
		onResetFilters?: () => void;
	}

	let { open = $bindable(), table, columns, groupOrder, onResetFilters }: Props = $props();

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

	const entries = $derived(filterEntries(columns, table));

	type FilterColumn = (typeof entries)[number]['col'];

	function clearAllFilters() {
		if (onResetFilters) onResetFilters();
		else table.resetColumnFilters();
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
	<div class="join w-full">
		<select
			class="select select-md join-item w-auto shrink-0"
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
				class="input input-md join-item min-w-0 grow"
				placeholder={header}
				value={state.value}
				oninput={(e) => setTextFilter(col.id, state.mode, e.currentTarget.value)}
			/>
		{/if}
	</div>
{/snippet}

{#snippet enumFilter(
	col: FilterColumn,
	label: ((value: string) => string) | undefined,
	options: readonly string[] | undefined
)}
	{@const facetedValues = options
		? new Map<unknown, number | undefined>(options.map((option) => [option, undefined]))
		: col.getFacetedUniqueValues()}
	{@const currentFilter = (col.getFilterValue() as string[] | undefined) ?? []}
	<div class="flex flex-wrap gap-1.5">
		{#each [...facetedValues.entries()] as [value, count] (value)}
			{@const filterKey = value == null || value === '' ? '—' : String(value)}
			{@const isSelected = currentFilter.includes(filterKey)}
			<button
				class="btn btn-sm rounded-full text-sm font-normal"
				class:btn-primary={isSelected}
				class:btn-soft={!isSelected}
				aria-pressed={isSelected}
				onclick={() => toggleEnumValue(col.id, filterKey)}
			>
				{filterKey === '—' || !label ? filterKey : label(filterKey)}
				{#if count !== undefined}<span class="text-sm opacity-70">{count}</span>{/if}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet booleanFilter(col: FilterColumn)}
	{@const currentValue = col.getFilterValue() as boolean | null | undefined}
	<div class="join">
		{#each booleanFilterOptions as option (option.label)}
			{@const isSelected = (currentValue ?? null) === option.value}
			<button
				class="btn btn-sm join-item text-sm font-normal"
				class:btn-primary={isSelected}
				class:btn-soft={!isSelected}
				aria-pressed={isSelected}
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
			class="input input-md w-20"
			placeholder={facetedMinMax?.[0]?.toString() ?? 'Min'}
			value={currentRange[0] ?? ''}
			oninput={(e) => setRangeFilter(col.id, 0, e.currentTarget.value)}
		/>
		<span class="text-base-content/50">—</span>
		<input
			type="number"
			class="input input-md w-20"
			placeholder={facetedMinMax?.[1]?.toString() ?? 'Max'}
			value={currentRange[1] ?? ''}
			oninput={(e) => setRangeFilter(col.id, 1, e.currentTarget.value)}
		/>
	</div>
{/snippet}

<SideDrawer bind:open title={m.filters()} icon="fa-filter">
	<div class="flex gap-2">
		<button class="btn btn-ghost btn-sm" onclick={clearAllFilters}>
			<i class="fa-sharp-duotone fa-solid fa-filter-circle-xmark"></i>
			{m.clearAllFilters()}
		</button>
	</div>

	<ColumnGroups
		{entries}
		{groupOrder}
		listClass="flex flex-col gap-4"
		groupClass="bg-base-200 rounded-box p-4"
	>
		{#snippet item({ col, filter, header })}
			<div class="flex flex-col gap-1.5">
				<span class="text-base font-medium">{header}</span>
				{#if filter.hint}
					<p class="text-sm text-base-content/70">{filter.hint}</p>
				{/if}

				{#if filter.type === 'text'}
					{@render textFilter(col, header)}
				{:else if filter.type === 'enum'}
					{@render enumFilter(col, filter.label, filter.options)}
				{:else if filter.type === 'boolean'}
					{@render booleanFilter(col)}
				{:else if filter.type === 'range'}
					{@render rangeFilter(col)}
				{/if}
			</div>
		{/snippet}
	</ColumnGroups>
</SideDrawer>
