<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import { renderComponent } from '#lib/components/tanStackTable/index';
	import type { ManagedColumn } from '#lib/components/tanStackTable/managedTable';
	import ManagedTable from '#lib/components/tanStackTable/ui/ManagedTable.svelte';
	import { capitalizeFirstLetter } from '#lib/helpers/capitalizeFirstLetter';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import HiddenIcon from './HiddenIcon.svelte';
	import WaitingListActions from './WaitingListActions.svelte';
	import type { PageProps } from './$types';
	import { toWaitingListRow, waitingListPositions, type WaitingListRow } from './waitingListRows';
	import { createTableState } from '#lib/components/tanStackTable/tableState.svelte.js';
	import {
		fetchAllWaitingListEntries,
		fetchWaitingListPage,
		fetchWaitingListPositions
	} from './waitingListQuery';
	import { liveSnapshot } from '#lib/api/liveSnapshot';

	let { params }: PageProps = $props();

	// Navigations (the table's own URL state is one) hand over fresh params; reading them inside an
	// awaited derived would refetch from whatever state the batch under way still shows.
	const conferenceId = $derived(params.conferenceId);

	// Set up before the first await: afterwards a server render has no request to read the URL of.
	// Search, filters, order and paging run in the backend; the table only holds this page.
	const tableState = createTableState({
		pageSize: 20,
		initialSorting: [{ id: 'createdAt', desc: false }]
	});
	// Only the start date, to work out how old each person will be by then.
	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			id: true,
			startConference: true
		})
	);

	let filterHidden = $state(true);
	/** Entries that got a seat have become registrations; shown on request, with the date. */
	let showSeated = $state(false);
	const toggles = $derived({ hideHidden: filterHidden, showSeated });

	const startConference = $derived(conference?.startConference);

	const page = $derived(
		await fetchWaitingListPage(conferenceId, tableState, toggles, startConference)
	);
	const waiting = $derived(await fetchWaitingListPositions(conferenceId));
	// read the live list once into a plain copy, see `liveSnapshot`
	const snapshotWaiting = liveSnapshot<{ id: string }>();
	const waitingCopy = $derived(snapshotWaiting(waiting));
	const positions = $derived(waitingListPositions(waitingCopy));
	const rows: WaitingListRow[] = $derived(
		page.rows.map((entry) => toWaitingListRow(entry, startConference, positions))
	);

	async function exportRows() {
		const entries = await fetchAllWaitingListEntries(
			conferenceId,
			tableState,
			toggles,
			startConference
		);
		return entries.map((entry) => toWaitingListRow(entry, startConference, positions));
	}

	const dateFormatter = new Intl.DateTimeFormat(getLocale(), {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	const columns: ManagedColumn<WaitingListRow>[] = [
		{
			id: 'actions',
			header: '',
			cell: ({ row }) =>
				renderComponent(WaitingListActions, {
					entryId: row.original.id,
					userId: row.original.userId,
					conferenceId: conferenceId,
					hidden: row.original.hidden
				}),
			enableSorting: false
		},
		{
			accessorKey: 'position',
			header: m.waitingListPosition(),
			cell: ({ getValue }) => {
				const position = getValue<number | undefined>();
				return position !== undefined ? String(position) : '—';
			},
			enableSorting: true
		},
		{
			accessorKey: 'createdAt',
			header: m.timestamp(),
			cell: ({ getValue }) => dateFormatter.format(getValue<Date>()),
			enableSorting: true
		},
		{
			accessorKey: 'assignedAt',
			header: m.waitingListSeatedAt(),
			cell: ({ getValue }) => {
				const seatedAt = getValue<Date | null>();
				return seatedAt ? dateFormatter.format(seatedAt) : '—';
			},
			enableSorting: true
		},
		{
			accessorKey: 'family_name',
			header: m.familyName(),
			cell: ({ getValue }) => capitalizeFirstLetter(getValue<string>()),
			filter: { type: 'text' },
			enableSorting: false
		},
		{
			accessorKey: 'given_name',
			header: m.givenName(),
			cell: ({ getValue }) => capitalizeFirstLetter(getValue<string>()),
			filter: { type: 'text' },
			enableSorting: false
		},
		{
			accessorKey: 'email',
			header: m.email(),
			filter: { type: 'text' },
			enableSorting: false
		},
		{
			accessorKey: 'phone',
			header: m.phone(),
			cell: ({ getValue }) => getValue<string | null>() ?? '—',
			filter: { type: 'text' },
			enableSorting: false
		},
		{
			accessorKey: 'conferenceAge',
			header: m.conferenceAge(),
			cell: ({ getValue }) => {
				const age = getValue<number | undefined>();
				return age !== undefined ? String(age) : '—';
			},
			filter: { type: 'range' },
			enableSorting: false
		},
		{
			accessorKey: 'participationCount',
			header: m.participationCount(),
			enableSorting: false
		},
		{
			accessorKey: 'city',
			header: m.city(),
			cell: ({ getValue }) => {
				const v = getValue<string | null>();
				return v ? capitalizeFirstLetter(v) : '—';
			},
			filter: { type: 'text' },
			enableSorting: false
		},
		{
			accessorKey: 'school',
			header: m.schoolOrInstitution(),
			cell: ({ getValue }) => getValue<string | null>() ?? '—',
			filter: { type: 'text' },
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
			filter: { type: 'boolean' },
			enableSorting: true
		}
	];
</script>

<ManagedTable
	{columns}
	{rows}
	onRowClick={(row) => openUserCard(row.userId)}
	storageKey="waiting-list-columns-{params.conferenceId}"
	{tableState}
	hasMore={page.hasMore}
	rowCount={page.total}
	{exportRows}
>
	{#snippet toolbar()}
		<label class="no-print flex cursor-pointer items-center gap-2 text-sm whitespace-nowrap">
			<i class="fa-sharp-duotone fa-solid fa-eye-slash"></i>
			{m.filterHiddenEntries()}
			<input type="checkbox" class="toggle toggle-primary toggle-sm" bind:checked={filterHidden} />
		</label>
		<label class="no-print flex cursor-pointer items-center gap-2 text-sm whitespace-nowrap">
			<i class="fa-sharp-duotone fa-solid fa-user-check"></i>
			{m.waitingListShowSeated()}
			<input type="checkbox" class="toggle toggle-primary toggle-sm" bind:checked={showSeated} />
		</label>
	{/snippet}
</ManagedTable>
