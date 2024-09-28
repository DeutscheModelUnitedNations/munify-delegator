<script lang="ts">
	import { Subscribe, Render, type TableBodyAttributes, type BodyRow } from 'svelte-headless-table';
	import type { Readable } from 'svelte/store';

	interface Props {
		rows: Readable<BodyRow<{}>[]>; // TODO type
		children?: any;
		tableBodyAttrs: Readable<TableBodyAttributes<{}>>;
	}

	let { rows, tableBodyAttrs }: Props = $props();
</script>

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
			</tr>
		</Subscribe>
	{/each}
</tbody>
