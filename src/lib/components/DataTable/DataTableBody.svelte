<script lang="ts">
	import { Subscribe, Render } from 'svelte-headless-table';

	interface Props {
		rows: any; // TODO type
		children?: any;
		tableBodyAttrs: any;
	}

	let { rows, children, tableBodyAttrs }: Props = $props();
</script>

<tbody {...$tableBodyAttrs}>
	{#each $rows as row (row.id)}
		<!-- TODO -->
		<!-- <Subscribe rowAttrs={row.attrs()} let:rowAttrs>
			<tr {...rowAttrs}>
				{#each row.cells as cell (cell.id)}
					<Subscribe attrs={cell.attrs()} let:attrs>
						<td {...attrs}>
							<Render of={cell.render()} />
						</td>
					</Subscribe>
				{/each}
				{#if children}
					{@render children()}
				{/if}
			</tr>
		</Subscribe> -->
	{/each}
</tbody>
