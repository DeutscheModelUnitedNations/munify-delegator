<script lang="ts">
	import DataGrid from '#lib/components/dataGrid/DataGrid.svelte';
	import { createLocalSource } from '#lib/components/dataGrid/dataSource';
	import { cellOf, type GridColumn } from '#lib/components/dataGrid/gridColumn';
	import getNationRegionalGroup from '#lib/helpers/getNationRegionalGroup';
	import { roleSeats } from '#lib/helpers/conferenceRole';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import FlagNameCell from './FlagNameCell.svelte';
	import SeatsCell from './SeatsCell.svelte';
	import type { ConferenceSeats, SeatedNation } from './conferenceSeats';

	interface Props {
		committees: ConferenceSeats['committees'];
		nations: SeatedNation[];
	}

	let { committees, nations }: Props = $props();

	type NationRow = {
		alpha2Code: string;
		alpha3Code: string;
		name: string;
		region: string;
		seatsByCommittee: Record<string, number>;
		total: number;
	};

	const rows = $derived<NationRow[]>(
		nations.map((role) => ({
			alpha2Code: role.nation.alpha2Code,
			alpha3Code: role.nation.alpha3Code,
			name: getFullTranslatedCountryNameFromISO3Code(role.nation.alpha3Code),
			region: getNationRegionalGroup(role.nation.alpha3Code) ?? '',
			seatsByCommittee: Object.fromEntries(
				committees.map((committee) => [
					committee.id,
					committee.roles.some((seated) => seated.id === role.id)
						? committee.numOfSeatsPerDelegation
						: 0
				])
			),
			total: roleSeats({ role, committees })
		}))
	);
	const regions = $derived([...new Set(rows.map((row) => row.region).filter(Boolean))].sort());

	const columns = $derived<GridColumn<NationRow>[]>([
		{
			id: 'name',
			type: 'text',
			label: m.nation(),
			alwaysVisible: true,
			size: 220,
			value: (row) => row.name,
			cell: (row) =>
				cellOf({ component: FlagNameCell, props: { name: row.name, alpha2Code: row.alpha2Code } })
		},
		{
			id: 'region',
			type: 'enum',
			label: m.regionalGroup(),
			options: regions,
			value: (row) => row.region
		},
		...committees.map((committee): GridColumn<NationRow> => ({
			id: `committee-${committee.id}`,
			type: 'number',
			label: committee.abbreviation,
			description: committee.name,
			group: m.committees(),
			align: 'center',
			size: 90,
			value: (row) => row.seatsByCommittee[committee.id] ?? 0,
			cell: (row) =>
				cellOf({ component: SeatsCell, props: { seats: row.seatsByCommittee[committee.id] ?? 0 } }),
			searchable: false
		})),
		{
			id: 'total',
			type: 'number',
			label: m.total(),
			align: 'center',
			size: 90,
			value: (row) => row.total,
			searchable: false
		}
	]);

	const source = createLocalSource({ rows: () => rows, columns: () => columns });
</script>

<DataGrid
	{columns}
	{source}
	rowId={(row) => row.alpha3Code}
	base={{ sorting: [{ id: 'name', desc: false }], pageSize: 250 }}
	label={m.nationsPool()}
	exportName="nations"
	urlPrefix="nations-"
/>
