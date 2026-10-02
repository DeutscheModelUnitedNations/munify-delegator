<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import {
		createTable,
		renderComponent,
		tableFeatures,
		rowSortingFeature,
		columnFilteringFeature,
		globalFilteringFeature,
		rowPaginationFeature,
		columnVisibilityFeature,
		createSortedRowModel,
		createFilteredRowModel,
		createPaginatedRowModel,
		autoFilterFns,
		autoSortFns,
		columnCanGlobalFilter,
		type ColumnDef,
		type SortingState,
		type PaginationState
	} from '$lib/components/tanStackTable';
	import { DataTable } from '$lib/components/tanStackTable/ui';
	import SortableTable from '$lib/components/tanStackTable/ui/SortableTable.svelte';
	import { capitalizeFirstLetter } from '$lib/helpers/capitalizeFirstLetter';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { m } from '$lib/paraglide/messages';
	import HiddenIcon from './HiddenIcon.svelte';
	import WaitingListActions from './WaitingListActions.svelte';
	import type { PageProps } from './$types';
	import { toWaitingListRow, visibleEntries, type WaitingListRow } from './waitingListRows';

	let { params }: PageProps = $props();

	/** Only entries still waiting - assigned ones have become real registrations. */
	const waitingListEntries = $derived(
		await client.liveQuery.waitingListEntries({
			__args: {
				where: { conferenceId: { eq: params.conferenceId }, assigned: { eq: false } }
			},
			id: true,
			user: {
				id: true,
				givenName: true,
				familyName: true,
				email: true,
				phone: true,
				city: true,
				birthday: true,
				conferenceParticipationsCount: true
			},
			school: true,
			experience: true,
			motivation: true,
			requests: true,
			hidden: true,
			createdAt: true
		})
	);
	// Only the start date, to work out how old each person will be by then.
	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: params.conferenceId },
			id: true,
			startConference: true
		})
	);

	let filterHidden = $state(true);
	let sorting = $state<SortingState>([{ id: 'createdAt', desc: false }]);
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 20 });
	let globalFilter = $state('');

	const startConference = $derived(conference?.startConference);
	const visible = $derived(visibleEntries(waitingListEntries, filterHidden));
	const rows: WaitingListRow[] = $derived(
		visible.map((entry) => toWaitingListRow(entry, startConference))
	);

	const totalCount = $derived(visible.length);

	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	const features = tableFeatures({
		rowSortingFeature,
		columnFilteringFeature,
		globalFilteringFeature,
		rowPaginationFeature,
		columnVisibilityFeature,
		sortedRowModel: createSortedRowModel(),
		filteredRowModel: createFilteredRowModel(),
		paginatedRowModel: createPaginatedRowModel(),
		filterFns: autoFilterFns,
		sortFns: autoSortFns
	});

	const columns: ColumnDef<typeof features, WaitingListRow>[] = [
		{
			id: 'actions',
			header: '',
			cell: ({ row }) =>
				renderComponent(WaitingListActions, {
					entryId: row.original.id,
					userId: row.original.userId,
					conferenceId: params.conferenceId,
					hidden: row.original.hidden
				}),
			enableSorting: false
		},
		{
			accessorKey: 'createdAt',
			header: m.timestamp(),
			cell: ({ getValue }) => dateFormatter.format(getValue<Date>()),
			enableSorting: true
		},
		{
			accessorKey: 'family_name',
			header: m.familyName(),
			cell: ({ getValue }) => capitalizeFirstLetter(getValue<string>()),
			enableSorting: true
		},
		{
			accessorKey: 'given_name',
			header: m.givenName(),
			cell: ({ getValue }) => capitalizeFirstLetter(getValue<string>()),
			enableSorting: true
		},
		{
			accessorKey: 'email',
			header: m.email(),
			enableSorting: true
		},
		{
			accessorKey: 'phone',
			header: m.phone(),
			cell: ({ getValue }) => getValue<string | null>() ?? '—',
			enableSorting: true
		},
		{
			accessorKey: 'conferenceAge',
			header: m.conferenceAge(),
			cell: ({ getValue }) => {
				const age = getValue<number | undefined>();
				return age !== undefined ? String(age) : '—';
			},
			enableSorting: true
		},
		{
			accessorKey: 'participationCount',
			header: m.participationCount(),
			enableSorting: true
		},
		{
			accessorKey: 'city',
			header: m.city(),
			cell: ({ getValue }) => {
				const v = getValue<string | null>();
				return v ? capitalizeFirstLetter(v) : '—';
			},
			enableSorting: true
		},
		{
			accessorKey: 'school',
			header: m.schoolOrInstitution(),
			cell: ({ getValue }) => getValue<string | null>() ?? '—',
			enableSorting: true
		},
		{
			accessorKey: 'motivation',
			header: m.motivation(),
			cell: ({ getValue }) => getValue<string | null>() ?? '—',
			enableSorting: false
		},
		{
			accessorKey: 'experience',
			header: m.experience(),
			cell: ({ getValue }) => getValue<string | null>() ?? '—',
			enableSorting: false
		},
		{
			accessorKey: 'requests',
			header: m.specialWishes(),
			cell: ({ getValue }) => getValue<string | null>() ?? '—',
			enableSorting: false
		},
		{
			accessorKey: 'hidden',
			header: m.hidden(),
			cell: ({ row }) =>
				renderComponent(HiddenIcon, {
					value: row.original.hidden
				}),
			enableSorting: true
		}
	];

	const table = createTable({
		features,
		get data() {
			return rows;
		},
		columns,
		state: {
			get sorting() {
				return sorting;
			},
			get pagination() {
				return pagination;
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
		onGlobalFilterChange: (updater) => {
			globalFilter = typeof updater === 'function' ? updater(globalFilter) : updater;
		},
		globalFilterFn: 'includesString',
		getColumnCanGlobalFilter: columnCanGlobalFilter
	});

	function handleRowClick(row: WaitingListRow) {
		openUserCard(row.userId, params.conferenceId);
	}

	function handleGlobalFilterChange(value: string) {
		globalFilter = value;
		pagination = { ...pagination, pageIndex: 0 };
	}
</script>

<div class="flex h-full flex-col">
	<div class="flex flex-wrap items-center gap-2 px-1 py-2">
		<label class="input input-sm input-bordered flex items-center gap-2">
			<i class="fa-duotone fa-magnifying-glass text-base-content/50"></i>
			<input
				type="text"
				placeholder={m.search()}
				class="grow"
				value={globalFilter}
				oninput={(e) => handleGlobalFilterChange(e.currentTarget.value)}
			/>
			{#if globalFilter}
				<button
					class="btn btn-circle btn-ghost btn-xs"
					aria-label="Clear search"
					onclick={() => handleGlobalFilterChange('')}
				>
					<i class="fa-duotone fa-xmark"></i>
				</button>
			{/if}
		</label>

		<div class="grow"></div>

		<span class="text-base-content/60 text-sm">
			{table.getFilteredRowModel().rows.length} / {totalCount}
		</span>

		<button
			class="btn btn-ghost btn-sm"
			onclick={() => {
				filterHidden = !filterHidden;
				pagination = { ...pagination, pageIndex: 0 };
			}}
		>
			<i class="fa-duotone fa-eye-slash"></i>
			{m.filterHiddenEntries()}
			{#if filterHidden}
				<span class="badge badge-primary badge-xs"></span>
			{/if}
		</button>
	</div>

	<SortableTable {table} onRowClick={handleRowClick} />

	<DataTable.Pagination {table} />
</div>
