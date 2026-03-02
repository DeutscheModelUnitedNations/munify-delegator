<script lang="ts">
	import {
		createSvelteTable,
		FlexRender,
		getCoreRowModel,
		getSortedRowModel,
		getFilteredRowModel,
		getPaginationRowModel,
		getFacetedRowModel,
		getFacetedUniqueValues,
		getFacetedMinMaxValues,
		type SortingState,
		type PaginationState,
		type ColumnFiltersState,
		type VisibilityState
	} from '$lib/components/TanStackTable';
	import { DataTable } from '$lib/components/TanStackTable/ui';
	import { m } from '$lib/paraglide/messages';
	import { queryParam } from 'sveltekit-search-params';
	import { openUserCard } from '$lib/components/UserCard/userCardState.svelte';
	import { page } from '$app/stores';
	import type { PageData } from './$houdini';
	import type { ParticipantRow, ColumnMeta } from './types';
	import { transformParticipants } from './dataTransform';
	import { createColumnDefs } from './columns';
	import TableToolbar from './TableToolbar.svelte';
	import FilterDrawer from './FilterDrawer.svelte';
	import ColumnConfigDrawer from './ColumnConfigDrawer.svelte';

	const { data }: { data: PageData } = $props();
	const queryData = $derived(data.AllConferenceParticipantsQuery);
	const conferenceId = $derived($page.params.conferenceId ?? '');

	const conference = $derived($queryData.data?.findUniqueConference);
	const startConference = $derived(conference?.startConference);

	const participants: ParticipantRow[] = $derived.by(() => {
		const qd = $queryData.data;
		if (!qd) return [];
		return transformParticipants(qd, startConference);
	});

	const columns = createColumnDefs();

	// --- State ---
	let sorting = $state<SortingState>([{ id: 'family_name', desc: false }]);
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 20 });
	let columnFilters = $state<ColumnFiltersState>([]);
	let columnVisibility = $state<VisibilityState>({});
	let globalFilter = $state('');

	let filterDrawerOpen = $state(false);
	let columnConfigDrawerOpen = $state(false);

	// --- URL Sync ---
	const searchParam = queryParam('search');
	const filtersParam = queryParam('filters');

	// Initialize from URL on load
	$effect(() => {
		if ($searchParam) {
			globalFilter = $searchParam;
		}
	});

	$effect(() => {
		if ($filtersParam) {
			try {
				const parsed = JSON.parse($filtersParam);
				if (Array.isArray(parsed)) {
					columnFilters = parsed;
				}
			} catch {
				// ignore invalid JSON
			}
		}
	});

	// --- localStorage for column visibility ---
	const storageKey = $derived(`participants-columns-${conferenceId}`);

	$effect(() => {
		if (typeof window === 'undefined') return;
		const stored = localStorage.getItem(storageKey);
		if (stored) {
			try {
				columnVisibility = JSON.parse(stored);
			} catch {
				// ignore
			}
		} else {
			// Initialize from column defaults
			const defaults: VisibilityState = {};
			for (const col of columns) {
				const id = ('accessorKey' in col ? col.accessorKey : undefined) ?? col.id;
				const meta = col.meta as ColumnMeta | undefined;
				if (id && meta) {
					defaults[String(id)] = meta.defaultVisible;
				}
			}
			columnVisibility = defaults;
		}
	});

	function handleVisibilityChange(state: VisibilityState) {
		columnVisibility = state;
		if (typeof window !== 'undefined') {
			localStorage.setItem(storageKey, JSON.stringify(state));
		}
	}

	function handleGlobalFilterChange(value: string) {
		globalFilter = value;
		$searchParam = value || null;
		pagination = { ...pagination, pageIndex: 0 };
	}

	// Sync column filters to URL
	$effect(() => {
		if (columnFilters.length > 0) {
			$filtersParam = JSON.stringify(columnFilters);
		} else {
			$filtersParam = null;
		}
	});

	// --- Table Instance ---
	const table = createSvelteTable({
		get data() {
			return participants;
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
			},
			get globalFilter() {
				return globalFilter;
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
		},
		onGlobalFilterChange: (updater) => {
			globalFilter = typeof updater === 'function' ? updater(globalFilter) : updater;
		},
		globalFilterFn: 'includesString',
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		getFacetedMinMaxValues: getFacetedMinMaxValues()
	});

	function handleRowClick(row: ParticipantRow) {
		openUserCard(row.userId, conferenceId);
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
	/>

	<DataTable.Root class="table-zebra table-sm">
		<DataTable.Header>
			{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
				<tr>
					{#each headerGroup.headers as header (header.id)}
						<DataTable.Head>
							{#if !header.isPlaceholder}
								<button
									class="flex items-center gap-2"
									class:cursor-pointer={header.column.getCanSort()}
									onclick={() => header.column.toggleSorting()}
								>
									<FlexRender
										content={header.column.columnDef.header}
										context={header.getContext()}
									/>
									{#if header.column.getIsSorted() === 'asc'}
										<i class="fa-duotone fa-arrow-down-a-z text-xs"></i>
									{:else if header.column.getIsSorted() === 'desc'}
										<i class="fa-duotone fa-arrow-down-z-a text-xs"></i>
									{:else if header.column.getCanSort()}
										<i class="fa-duotone fa-arrows-up-down text-xs opacity-30"></i>
									{/if}
								</button>
							{/if}
						</DataTable.Head>
					{/each}
				</tr>
			{/each}
		</DataTable.Header>
		<DataTable.Body>
			{#each table.getRowModel().rows as row (row.id)}
				<DataTable.Row onclick={() => handleRowClick(row.original)}>
					{#each row.getVisibleCells() as cell (cell.id)}
						<DataTable.Cell>
							<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
						</DataTable.Cell>
					{/each}
				</DataTable.Row>
			{:else}
				<tr>
					<td
						colspan={table.getVisibleLeafColumns().length}
						class="py-8 text-center text-base-content/50"
					>
						{m.noResults()}
					</td>
				</tr>
			{/each}
		</DataTable.Body>
	</DataTable.Root>

	<DataTable.Pagination {table} />
</div>

<FilterDrawer bind:open={filterDrawerOpen} {table} />
<ColumnConfigDrawer
	bind:open={columnConfigDrawerOpen}
	{table}
	{conferenceId}
	onVisibilityChange={handleVisibilityChange}
/>
