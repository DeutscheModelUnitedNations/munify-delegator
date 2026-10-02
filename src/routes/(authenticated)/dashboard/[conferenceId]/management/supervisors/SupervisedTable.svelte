<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** Number of (unlabelled) columns the rows fill */
		columnCount: number;
		/** Whether there is nothing to list, in which case `emptyMessage` stands in for the rows */
		empty: boolean;
		emptyMessage: string;
		/** The table rows */
		children: Snippet;
	}

	let { title, columnCount, empty, emptyMessage, children }: Props = $props();

	const columns = $derived(Array.from({ length: columnCount }, (_, i) => i));
</script>

<div class="flex flex-col">
	<h3 class="text-xl font-bold">{title}</h3>
	<div class="overflow-x-auto">
		<table class="table">
			<thead>
				<tr>
					{#each columns as column (column)}
						<th></th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#if empty}
					<tr>
						<td>{emptyMessage}</td>
					</tr>
				{:else}
					{@render children()}
				{/if}
			</tbody>
		</table>
	</div>
</div>
