<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { renderComponent } from '$lib/components/tanStackTable';
	import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
	import ManagedTable from '$lib/components/tanStackTable/ui/ManagedTable.svelte';
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

	const startConference = $derived(conference?.startConference);
	const visible = $derived(visibleEntries(waitingListEntries, filterHidden));
	const rows: WaitingListRow[] = $derived(
		visible.map((entry) => toWaitingListRow(entry, startConference))
	);

	const dateFormatter = new Intl.DateTimeFormat(undefined, {
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
</script>

<div class="mb-2 flex justify-end">
	<button class="btn btn-ghost btn-sm" onclick={() => (filterHidden = !filterHidden)}>
		<i class="fa-duotone fa-eye-slash"></i>
		{m.filterHiddenEntries()}
		{#if filterHidden}
			<span class="badge badge-primary badge-xs"></span>
		{/if}
	</button>
</div>

<ManagedTable
	{columns}
	{rows}
	onRowClick={(row) => openUserCard(row.userId)}
	initialSorting={[{ id: 'createdAt', desc: false }]}
	pageSize={20}
/>
