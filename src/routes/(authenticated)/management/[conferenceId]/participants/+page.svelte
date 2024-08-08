<script lang="ts">
	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import { createTable, Subscribe, Render } from 'svelte-headless-table';
	import { addSortBy, addColumnOrder } from 'svelte-headless-table/plugins';
	import { readable } from 'svelte/store';

	const data = readable([
		{
			family_name: 'Ada',
			given_name: 'Lovelace',
			birthdate: new Date('1815-12-10'),
			email: 'ada@lovelace.preinternet',
			phone: '+49 123 456 7890'
		},
		{
			family_name: 'Grace',
			given_name: 'Hopper',
			birthdate: new Date('1906-12-09'),
			email: 'grace@hopper.preinternet',
			phone: '+49 123 456 7890'
		}
	]);

	const table = createTable(data, { sort: addSortBy() });

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
		}),
	]);

	const { headerRows, rows, tableAttrs, tableBodyAttrs, pluginStates } =
		table.createViewModel(columns);

	let tableSize = $state('md');
	let zebra = $state(true);
</script>

<ManagementHeader title="Teilnehmende" />

<div class="mt-4 overflow-x-auto">
	<table {...$tableAttrs} class="table {zebra && 'table-zebra'} table-{tableSize} table-pin-rows">
		<thead>
			{#each $headerRows as headerRow (headerRow.id)}
				<Subscribe rowAttrs={headerRow.attrs()} let:rowAttrs>
					<tr {...rowAttrs}>
						{#each headerRow.cells as cell (cell.id)}
							<Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
								<th
									{...attrs}
									onclick={props.sort.toggle}
									class="hover:bg-base-300 cursor-pointer select-none transition-all duration-200"
								>
									<Render of={cell.render()} />
									{#if props.sort.order === 'asc'}
										<i class="fa-duotone fa-arrow-down-a-z"></i>
									{:else if props.sort.order === 'desc'}
										<i class="fa-duotone fa-arrow-down-z-a"></i>
									{/if}
								</th>
							</Subscribe>
						{/each}
					</tr>
				</Subscribe>
			{/each}
		</thead>
		<tbody {...$tableBodyAttrs}>
			{#each $rows as row (row.id)}
				<Subscribe rowAttrs={row.attrs()} let:rowAttrs>
					<tr {...rowAttrs}>
						{#each row.cells as cell (cell.id)}
							<Subscribe attrs={cell.attrs()} let:attrs>
								<td {...attrs}>
									<Render of={cell.render()} />
								</td>
							</Subscribe>
						{/each}
            <td>
              <button class="btn btn-ghost btn-circle btn-sm"><i class="fas fa-ellipsis"></i></button>
            </td>
					</tr>
				</Subscribe>
			{/each}
		</tbody>
	</table>
</div>

<section class="mt-20">
	<div class="flex gap-4">
		<div class="card bg-base-100 dark:bg-base-200 shadow-md p-4">
			<div class="card-title">Export</div>
			<div class="card-body flex-row">
				<button class="btn btn-primary">
					<i class="fas fa-file-pdf text-xl"></i>
				</button>
				<button class="btn btn-primary">
					<i class="fas fa-file-csv text-xl"></i>
				</button>
				<button class="btn btn-primary">
					<i class="fas fa-file-xls text-xl"></i>
				</button>
			</div>
		</div>
	</div>
</section>
<section class="mt-4">
	<div class="flex flex-wrap gap-4">
		<div class="card bg-base-100 dark:bg-base-200 shadow-md p-4">
			<div class="card-title">Tabellengröße</div>
			<div class="card-body">
				<input
					type="range"
					min="0"
					max="3"
					value="2"
					class="range"
					step="1"
					onchange={(e) => {
						switch (e.target.value) {
							case '0':
								tableSize = 'xs';
								break;
							case '1':
								tableSize = 'sm';
								break;
							case '2':
								tableSize = 'md';
								break;
							case '3':
								tableSize = 'lg';
								break;
							default:
								tableSize = 'md';
								break;
						}
					}}
				/>
				<div class="flex w-full justify-between px-2 text-xs">
					<span>xs</span>
					<span>sm</span>
					<span>md</span>
					<span>lg</span>
				</div>
			</div>
		</div>
		<div class="card bg-base-100 dark:bg-base-200 shadow-md p-4">
			<div class="card-title">Zebra</div>
			<div class="card-body">
				<input
					type="checkbox"
					class="toggle"
					checked={zebra}
					onchange={(e) => {
						zebra = e.target.checked;
					}}
				/>
			</div>
		</div>
	</div>
</section>
