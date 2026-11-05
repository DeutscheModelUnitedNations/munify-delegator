<script lang="ts">
	import DataGrid from '#lib/components/dataGrid/DataGrid.svelte';
	import { createLocalSource } from '#lib/components/dataGrid/dataSource';
	import { cellOf, type GridColumn } from '#lib/components/dataGrid/gridColumn';
	import { m } from '#lib/paraglide/messages';
	import FlagNameCell from './FlagNameCell.svelte';
	import type { ConferenceSeats } from './conferenceSeats';

	interface Props {
		nonStateActors: ConferenceSeats['roles'];
	}

	let { nonStateActors }: Props = $props();

	type Nsa = Props['nonStateActors'][number];

	const columns: GridColumn<Nsa>[] = [
		{
			id: 'name',
			type: 'text',
			label: m.nonStateActors(),
			alwaysVisible: true,
			size: 240,
			value: (row) => row.name,
			cell: (row) =>
				cellOf({
					component: FlagNameCell,
					props: { name: row.name ?? '', nsa: true, nsaIcon: row.fontAwesomeIcon }
				})
		},
		{
			id: 'description',
			type: 'text',
			label: m.description(),
			size: 360,
			sortable: false,
			value: (row) => row.description
		},
		{
			id: 'seats',
			type: 'number',
			label: m.seatAmount(),
			align: 'center',
			size: 110,
			value: (row) => row.seatAmount
		}
	];

	const source = createLocalSource({ rows: () => nonStateActors, columns: () => columns });
</script>

<DataGrid
	{columns}
	{source}
	rowId={(row) => row.id}
	base={{ sorting: [{ id: 'name', desc: false }], pageSize: 100 }}
	label={m.nsaPool()}
	exportName="non-state-actors"
	urlPrefix="nsas-"
/>
