<script lang="ts">
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import DataTableBody from '$lib/components/DataTable/DataTableBody.svelte';
	import DataTableHeader from '$lib/components/DataTable/DataTableHeader.svelte';
	import TableSearch from '$lib/components/DataTable/TableSearch.svelte';
	import TableSizeControl from '$lib/components/DataTable/TableSizeControl.svelte';
	import ZebraControl from '$lib/components/DataTable/ZebraControl.svelte';
	import ExportButtons from '$lib/components/DataTable/ExportButtons.svelte';
	import RowOptions from '$lib/components/DataTable/RowOptions.svelte';
	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import { createTable } from 'svelte-headless-table';
	import { addDataExport, addSortBy, addTableFilter } from 'svelte-headless-table/plugins';
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { faker } from '@faker-js/faker';
	import PrintHeader from '$lib/components/DataTable/PrintHeader.svelte';

	const data = writable<
		{
			family_name: string;
			given_name: string;
			birthdate: Date;
			email: string;
			phone: string;
		}[]
	>([]);

	onMount(async () => {
		const generated = [];
		for (let i = 0; i < 100; i++) {
			generated.push({
				family_name: faker.person.lastName(),
				given_name: faker.person.firstName(),
				birthdate: faker.date.past(),
				email: faker.internet.email(),
				phone: faker.phone.number()
			});
		}
		data.set(generated);
	});

	const table = createTable(data, {
		sort: addSortBy({
			initialSortKeys: [{ id: 'family_name', order: 'asc' }]
		}),
		filter: addTableFilter(),
		export: addDataExport()
	});

	const columns = table.createColumns([
		table.column({
			header: 'Nachname',
			accessor: 'family_name'
		}),
		table.column({
			header: 'Vorname',
			accessor: 'given_name'
		}),
		table.column({
			header: 'Geburtsdatum',
			accessor: 'birthdate',
			cell: ({ value }) => value.toLocaleDateString()
		}),
		table.column({
			header: 'E-Mail',
			accessor: 'email'
		}),
		table.column({
			header: 'Telefon',
			accessor: 'phone'
		})
	]);

	const { headerRows, rows, tableAttrs, tableBodyAttrs, pluginStates } =
		table.createViewModel(columns);

	const filterValue = pluginStates.filter.filterValue;
	const exportedData = pluginStates.export.exportedData;

	let tableSize = $state<'xs' | 'sm' | 'md' | 'lg'>('md');
	let zebra = $state(true);
</script>

<ManagementHeader title="Teilnehmende" />
<PrintHeader title="Teilnehmende" globalSearchValue={$filterValue ?? undefined} />

<section class="my-10 no-print">
	<div class="flex flex-wrap gap-4">
		<ExportButtons {exportedData} />
		<TableSizeControl bind:tableSize />
		<ZebraControl bind:zebra />
	</div>
</section>

<TableSearch searchValue={$filterValue} changeSearchValue={(v) => filterValue.set(v)} />

<div class="mt-4 overflow-x-auto">
	<DataTable {tableAttrs} {tableSize} {zebra}>
		<DataTableHeader {headerRows} />
		<DataTableBody {rows} {tableBodyAttrs}>
			<RowOptions />
		</DataTableBody>
	</DataTable>
</div>
