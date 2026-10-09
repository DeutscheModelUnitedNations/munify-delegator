<script lang="ts">
	import { renderComponent } from '$lib/components/tanStackTable';
	import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
	import ManagedTable from '$lib/components/tanStackTable/ui/ManagedTable.svelte';
	import { m } from '$lib/paraglide/messages';
	import FlagNameCell from './FlagNameCell.svelte';
	import type { ConferenceSeats } from './conferenceSeats';

	interface Props {
		nonStateActors: ConferenceSeats['nonStateActors'];
	}

	let { nonStateActors }: Props = $props();

	type Nsa = Props['nonStateActors'][number];

	const columns: ManagedColumn<Nsa>[] = [
		{
			id: 'name',
			header: m.nonStateActors(),
			accessorFn: (row) => row.name,
			cell: ({ row }) =>
				renderComponent(FlagNameCell, {
					name: row.original.name,
					nsa: true,
					nsaIcon: row.original.fontAwesomeIcon
				})
		},
		{
			id: 'description',
			header: m.description(),
			accessorFn: (row) => row.description,
			enableSorting: false
		},
		{
			id: 'seats',
			header: m.seatAmount(),
			accessorFn: (row) => row.seatAmount,
			filter: { type: 'range' }
		}
	];
</script>

<ManagedTable
	{columns}
	rows={nonStateActors}
	queryParamKey="nsa"
	columnClasses={{ seats: 'text-center' }}
	initialSorting={[{ id: 'name', desc: false }]}
	storageKey="seat-overview-nsas"
/>
