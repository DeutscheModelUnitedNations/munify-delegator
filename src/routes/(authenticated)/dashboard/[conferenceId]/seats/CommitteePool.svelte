<script lang="ts">
	import { renderComponent } from '$lib/components/tanStackTable';
	import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
	import ManagedTable from '$lib/components/tanStackTable/ui/ManagedTable.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import { m } from '$lib/paraglide/messages';
	import AgendaItemsCell from './AgendaItemsCell.svelte';
	import type { ConferenceSeats } from './conferenceSeats';

	interface Props {
		committees: ConferenceSeats['committees'];
	}

	let { committees }: Props = $props();

	type Committee = Props['committees'][number];

	let openAgendaItemId = $state<string>();

	const agendaItems = $derived(
		committees.flatMap((committee) =>
			committee.agendaItems.map((item) => ({ ...item, committee: committee.name }))
		)
	);
	const openAgendaItem = $derived(agendaItems.find((item) => item.id === openAgendaItemId));

	const columns: ManagedColumn<Committee>[] = [
		{ id: 'abbreviation', header: m.abbreviation(), accessorFn: (row) => row.abbreviation },
		{ id: 'name', header: m.name(), accessorFn: (row) => row.name },
		{
			id: 'nations',
			header: m.nations(),
			accessorFn: (row) => row.nations.length,
			filter: { type: 'range' }
		},
		{
			id: 'seatsPerDelegation',
			header: m.membersPerDelegation(),
			accessorFn: (row) => row.numOfSeatsPerDelegation,
			filter: { type: 'range' }
		},
		{
			id: 'agendaItems',
			header: m.agendaItems(),
			accessorFn: (row) => row.agendaItems.map((item) => item.title).join(', '),
			cell: ({ row }) =>
				renderComponent(AgendaItemsCell, {
					items: row.original.agendaItems,
					onOpen: (id: string) => (openAgendaItemId = id)
				}),
			enableSorting: false
		}
	];
</script>

<ManagedTable
	{columns}
	rows={committees}
	queryParamKey="committee"
	columnClasses={{ nations: 'text-center', seatsPerDelegation: 'text-center' }}
	initialSorting={[{ id: 'name', desc: false }]}
	storageKey="seat-overview-committees"
/>

<Drawer
	title={openAgendaItem?.title}
	open={!!openAgendaItem}
	loading={false}
	category={openAgendaItem?.committee ?? ''}
	onClose={() => (openAgendaItemId = undefined)}
>
	<p class="whitespace-pre-wrap">{openAgendaItem?.teaserText}</p>
</Drawer>
