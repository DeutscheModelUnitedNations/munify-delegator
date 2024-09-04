<script lang="ts">
	import { Subscribe, Render } from 'svelte-headless-table';

	interface Props {
		headerRows: any; // TODO type
		children?: any;
	}

	let { headerRows, children }: Props = $props();
</script>

<thead>
	{#each $headerRows as headerRow (headerRow.id)}
		<!-- TODO -->
		<!-- <Subscribe rowAttrs={headerRow.attrs()} let:rowAttrs>
			<tr {...rowAttrs}>
				{#each headerRow.cells as cell (cell.id)}
					<Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
						<th
							{...attrs}
							on:click={props.sort.toggle}
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
				{#if children}
					{@render children()}
				{/if}
			</tr>
		</Subscribe> -->
	{/each}
</thead>
