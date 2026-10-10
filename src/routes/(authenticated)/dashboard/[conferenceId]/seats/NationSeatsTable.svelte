<script lang="ts">
	import { renderComponent } from '$lib/components/tanStackTable';
	import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
	import ManagedTable from '$lib/components/tanStackTable/ui/ManagedTable.svelte';
	import { getUniqueNations } from '$lib/helpers/getUniqueNations';
	import getNationRegionalGroup from '$lib/helpers/getNationRegionalGroup';
	import getNumOfSeatsPerNation from '$lib/helpers/numOfSeatsPerNation';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { m } from '$lib/paraglide/messages';
	import FlagNameCell from './FlagNameCell.svelte';
	import SeatsCell from './SeatsCell.svelte';
	import type { ConferenceSeats } from './conferenceSeats';

	interface Props {
		committees: ConferenceSeats['committees'];
	}

	let { committees }: Props = $props();

	type NationRow = {
		alpha2Code: string;
		alpha3Code: string;
		name: string;
		region: string;
		seatsByCommittee: Record<string, number>;
		total: number;
	};

	const rows = $derived<NationRow[]>(
		getUniqueNations(committees).map((nation) => ({
			alpha2Code: nation.alpha2Code,
			alpha3Code: nation.alpha3Code,
			name: getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code),
			region: getNationRegionalGroup(nation.alpha3Code) ?? '',
			seatsByCommittee: Object.fromEntries(
				committees.map((committee) => [
					committee.id,
					committee.nations.some((n) => n.alpha3Code === nation.alpha3Code)
						? committee.numOfSeatsPerDelegation
						: 0
				])
			),
			total: getNumOfSeatsPerNation(nation, committees)
		}))
	);

	const columns = $derived<ManagedColumn<NationRow>[]>([
		{
			id: 'name',
			header: m.nation(),
			accessorFn: (row) => row.name,
			cell: ({ row }) =>
				renderComponent(FlagNameCell, {
					name: row.original.name,
					alpha2Code: row.original.alpha2Code
				})
		},
		{
			id: 'region',
			header: m.regionalGroup(),
			accessorFn: (row) => row.region,
			filter: { type: 'enum' }
		},
		...committees.map((committee): ManagedColumn<NationRow> => ({
			id: `committee-${committee.id}`,
			header: committee.abbreviation,
			description: committee.name,
			group: m.committees(),
			accessorFn: (row) => row.seatsByCommittee[committee.id] ?? 0,
			cell: ({ row }) =>
				renderComponent(SeatsCell, {
					seats: row.original.seatsByCommittee[committee.id] ?? 0
				}),
			exportValue: (row) => String(row.seatsByCommittee[committee.id] ?? 0),
			filter: { type: 'range' }
		})),
		{
			id: 'total',
			header: m.total(),
			accessorFn: (row) => row.total,
			filter: { type: 'range' }
		}
	]);
</script>

<ManagedTable
	{columns}
	{rows}
	queryParamKey="nation"
	pageSize={200}
	columnClasses={{ total: 'text-center', region: 'whitespace-nowrap' }}
	initialSorting={[{ id: 'name', desc: false }]}
	storageKey="seat-overview-nations"
/>
