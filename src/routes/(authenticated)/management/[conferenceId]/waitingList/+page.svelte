<script lang="ts">
	import { page } from '$app/state';
	import { client } from '$lib/api/rumbleClient/client';
	import {
		createSvelteTable,
		FlexRender,
		renderComponent,
		getCoreRowModel,
		getSortedRowModel,
		getFilteredRowModel,
		getPaginationRowModel,
		type ColumnDef,
		type SortingState,
		type PaginationState
	} from '$lib/components/tanStackTable';
	import { DataTable } from '$lib/components/tanStackTable/ui';
	import { capitalizeFirstLetter } from '$lib/helpers/capitalizeFirstLetter';
	import { getAgeAtConference } from '$lib/helpers/ageChecker';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { m } from '$lib/paraglide/messages';
	import HiddenIcon from './HiddenIcon.svelte';
	import WaitingListActions from './WaitingListActions.svelte';

	type WaitingListEntry = (typeof waitingListEntries)[number];

	interface WaitingListRow {
		id: string;
		userId: string;
		createdAt: Date;
		family_name: string;
		given_name: string;
		email: string;
		phone: string | null;
		conferenceAge: number | undefined;
		participationCount: number;
		city: string | null;
		school: string | null;
		motivation: string | null;
		experience: string | null;
		requests: string | null;
		hidden: boolean;
	}

	/** Only entries still waiting - assigned ones have become real registrations. */
	const waitingListEntries = $derived(
		await client.liveQuery.waitingListEntries({
			__args: {
				where: { conferenceId: { eq: page.params.conferenceId! }, assigned: { eq: false } }
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
			assigned: true,
			createdAt: true
		})
	);
	// Only the start date, to work out how old each person will be by then.
	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: page.params.conferenceId! },
			id: true,
			startConference: true
		})
	);

	let filterHidden = $state(true);
	let sorting = $state<SortingState>([{ id: 'createdAt', desc: false }]);
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 20 });
	let globalFilter = $state('');

	const rows: WaitingListRow[] = $derived.by(() => {
		const entries = waitingListEntries;
		const filtered = filterHidden ? entries.filter((e: WaitingListEntry) => !e.hidden) : entries;

		return filtered.map((entry: WaitingListEntry) => ({
			id: entry.id,
			userId: entry.user.id,
			createdAt: new Date(entry.createdAt),
			family_name: entry.user.familyName,
			given_name: entry.user.givenName,
			email: entry.user.email,
			phone: entry.user.phone ?? null,
			conferenceAge:
				entry.user.birthday && conference?.startConference
					? getAgeAtConference(entry.user.birthday, conference.startConference)
					: undefined,
			participationCount: entry.user.conferenceParticipationsCount,
			city: entry.user.city ?? null,
			school: entry.school ?? null,
			motivation: entry.motivation ?? null,
			experience: entry.experience ?? null,
			requests: entry.requests ?? null,
			hidden: entry.hidden
		}));
	});

	const totalCount = $derived(
		filterHidden
			? (waitingListEntries.filter((e: WaitingListEntry) => !e.hidden).length ?? 0)
			: waitingListEntries.length
	);

	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	const columns: ColumnDef<WaitingListRow>[] = [
		{
			id: 'actions',
			header: '',
			cell: ({ row }) =>
				renderComponent(WaitingListActions, {
					entryId: row.original.id,
					userId: row.original.userId,
					conferenceId: page.params.conferenceId!,
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

	const table = createSvelteTable({
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
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	});

	function handleRowClick(row: WaitingListRow) {
		openUserCard(row.userId, page.params.conferenceId!);
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
						class="text-base-content/50 py-8 text-center"
					>
						{m.noResults()}
					</td>
				</tr>
			{/each}
		</DataTable.Body>
	</DataTable.Root>

	<DataTable.Pagination {table} />
</div>
