<script lang="ts">
	import DataGrid from '#lib/components/dataGrid/DataGrid.svelte';
	import { createLocalSource } from '#lib/components/dataGrid/dataSource';
	import { cellOf, type GridColumn } from '#lib/components/dataGrid/gridColumn';
	import Drawer from '#lib/components/Drawer.svelte';
	import { m } from '#lib/paraglide/messages';
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

	const columns: GridColumn<Committee>[] = [
		{
			id: 'abbreviation',
			type: 'text',
			label: m.abbreviation(),
			alwaysVisible: true,
			size: 110,
			value: (row) => row.abbreviation
		},
		{ id: 'name', type: 'text', label: m.name(), size: 260, value: (row) => row.name },
		{
			id: 'nations',
			type: 'number',
			label: m.nations(),
			align: 'center',
			size: 100,
			value: (row) => row.roles.length,
			searchable: false
		},
		{
			id: 'seatsPerDelegation',
			type: 'number',
			label: m.membersPerDelegation(),
			align: 'center',
			size: 140,
			value: (row) => row.numOfSeatsPerDelegation,
			searchable: false
		},
		{
			id: 'agendaItems',
			type: 'text',
			label: m.agendaItems(),
			size: 360,
			sortable: false,
			groupable: false,
			value: (row) => row.agendaItems.map((item) => item.title).join(', '),
			cell: (row) =>
				cellOf({
					component: AgendaItemsCell,
					props: { items: row.agendaItems, onOpen: (id: string) => (openAgendaItemId = id) }
				})
		}
	];

	const source = createLocalSource({ rows: () => committees, columns: () => columns });
</script>

<DataGrid
	{columns}
	{source}
	rowId={(row) => row.id}
	base={{ sorting: [{ id: 'name', desc: false }], pageSize: 100 }}
	label={m.committeesAndAgendaItems()}
	exportName="committees"
	urlPrefix="committees-"
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
