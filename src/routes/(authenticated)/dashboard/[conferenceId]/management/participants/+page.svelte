<script lang="ts">
	import {
		createTable,
		createFuzzySearch,
		rowSearchText,
		type SortingState,
		type PaginationState,
		type ColumnFiltersState,
		type ColumnVisibilityState
	} from '$lib/components/tanStackTable';
	import { DataTable } from '$lib/components/tanStackTable/ui';
	import SortableTable from '$lib/components/tanStackTable/ui/SortableTable.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { fetchConferenceParticipants } from './conferenceParticipants';
	import type { ParticipantRow } from './types';
	import { participantTableFeatures } from './tableFeatures';
	import { transformParticipants } from './dataTransform';
	import { createColumnDefs } from './columns';
	import { defaultColumnFilters, initialColumnVisibility, parseColumnFilters } from './tableState';
	import { getPlainTextValue, getColumnHeader } from './exportHelpers';
	import { downloadCSV } from '$lib/utils/downloadHelpers';
	import TableToolbar from './TableToolbar.svelte';
	import FilterDrawer from './FilterDrawer.svelte';
	import ColumnConfigDrawer from './ColumnConfigDrawer.svelte';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	const conferenceId = $derived(routeParams.conferenceId ?? '');

	const registrations = $derived(await fetchConferenceParticipants(conferenceId));
	const conference = $derived(registrations.conference);
	const conferenceState = $derived(conference?.state);
	const startConference = $derived(conference?.startConference);
	const endConference = $derived(conference?.endConference);

	const participants: ParticipantRow[] = $derived.by(() => {
		return transformParticipants(registrations, startConference, endConference);
	});

	const columns = createColumnDefs();

	// --- State ---
	const defaultSorting: SortingState = [{ id: 'family_name', desc: false }];
	// Searching shows the best match first, so it replaces the sorting until one is chosen again
	let sorting = $state<SortingState>(defaultSorting);
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 20 });
	let columnFilters = $state<ColumnFiltersState>([]);
	let columnVisibility = $state<ColumnVisibilityState>({});
	let globalFilter = $state('');

	const searchParticipants = $derived(
		createFuzzySearch(participants, (row, index) => rowSearchText(columns, row, index))
	);
	const searchedParticipants = $derived(searchParticipants(globalFilter));

	let filterDrawerOpen = $state(false);
	let columnConfigDrawerOpen = $state(false);

	// --- URL Sync ---
	const params = queryParameters({ search: true, filters: true });

	// Initialize from URL on load
	$effect(() => {
		if (params.search) {
			globalFilter = params.search;
			sorting = [];
		}
	});

	// Tracks whether the default "accepted" filter has been applied once.
	// Resetting this flag (via resetDefaultFilter) allows the default to re-apply,
	// so the "reset filters" button restores the default rather than clearing everything.
	let defaultFilterApplied = $state(false);

	function resetDefaultFilter() {
		defaultFilterApplied = false;
	}

	$effect(() => {
		// Filters from the URL, or the "accepted" filter once for later conference states. After
		// this, users can remove it without it snapping back; the "reset filters" button flips
		// defaultFilterApplied back to false, which re-applies the default.
		const filters = params.filters
			? parseColumnFilters(params.filters)
			: defaultColumnFilters(defaultFilterApplied, conferenceState);
		if (filters) {
			columnFilters = filters;
			defaultFilterApplied = true;
		}
	});

	// --- localStorage for column visibility ---
	const storageKey = $derived(`participants-columns-${conferenceId}`);

	$effect(() => {
		if (typeof window === 'undefined') return;
		const visibility = initialColumnVisibility(localStorage.getItem(storageKey), columns);
		if (visibility) columnVisibility = visibility;
	});

	function handleVisibilityChange(state: ColumnVisibilityState) {
		columnVisibility = state;
		if (typeof window !== 'undefined') {
			localStorage.setItem(storageKey, JSON.stringify(state));
		}
	}

	function handleGlobalFilterChange(value: string) {
		globalFilter = value;
		sorting = value.trim() ? [] : defaultSorting;
		params.search = value || null;
		pagination = { ...pagination, pageIndex: 0 };
	}

	// Sync column filters to URL
	$effect(() => {
		if (columnFilters.length > 0) {
			params.filters = JSON.stringify(columnFilters);
		} else {
			params.filters = null;
		}
	});

	// --- Table Instance ---
	const table = createTable({
		features: participantTableFeatures,
		get data() {
			return [...searchedParticipants];
		},
		columns,
		state: {
			get sorting() {
				return sorting;
			},
			get pagination() {
				return pagination;
			},
			get columnFilters() {
				return columnFilters;
			},
			get columnVisibility() {
				return columnVisibility;
			}
		},
		onSortingChange: (updater) => {
			sorting = typeof updater === 'function' ? updater(sorting) : updater;
		},
		onPaginationChange: (updater) => {
			pagination = typeof updater === 'function' ? updater(pagination) : updater;
		},
		onColumnFiltersChange: (updater) => {
			columnFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
			pagination = { ...pagination, pageIndex: 0 };
		},
		onColumnVisibilityChange: (updater) => {
			const newState = typeof updater === 'function' ? updater(columnVisibility) : updater;
			handleVisibilityChange(newState);
		}
	});

	function handleRowClick(row: ParticipantRow) {
		openUserCard(row.userId);
	}

	function handleExport() {
		const visibleColumns = table.getVisibleLeafColumns();
		const rows = table.getFilteredRowModel().rows;
		const columnDefs = columns;

		const header = visibleColumns.map((col) => {
			const def = columnDefs.find(
				(d) => (d.id ?? ('accessorKey' in d ? d.accessorKey : undefined)) === col.id
			);
			return def ? getColumnHeader(def) : col.id;
		});

		const data = rows.map((row) =>
			visibleColumns.map((col) => getPlainTextValue(row.original, col.id))
		);

		const timestamp = new Date().toISOString().slice(0, 10);
		downloadCSV(header, data, `participants-${timestamp}.csv`);
	}
</script>

<div class="flex h-full flex-col">
	<TableToolbar
		{table}
		{globalFilter}
		onGlobalFilterChange={handleGlobalFilterChange}
		{columnFilters}
		onOpenFilterDrawer={() => (filterDrawerOpen = true)}
		onOpenColumnConfig={() => (columnConfigDrawerOpen = true)}
		onExport={handleExport}
	/>

	<SortableTable {table} onRowClick={handleRowClick} />

	<DataTable.Pagination {table} />
</div>

<FilterDrawer bind:open={filterDrawerOpen} {table} onResetFilters={resetDefaultFilter} />
<ColumnConfigDrawer
	bind:open={columnConfigDrawerOpen}
	{table}
	onVisibilityChange={handleVisibilityChange}
/>
