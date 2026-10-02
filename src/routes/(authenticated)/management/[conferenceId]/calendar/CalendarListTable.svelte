<script lang="ts">
	import type { Snippet } from 'svelte';

	/** A calendar tab's list: an empty state while there is nothing, a table otherwise. */
	interface Props {
		empty: boolean;
		/** FontAwesome icon class of the empty state (e.g. 'fa-calendar-days') */
		emptyIcon: string;
		emptyText: string;
		/** A call to action under the empty state's text */
		emptyAction?: Snippet;
		/** The column headers */
		headers: string[];
		/** The table rows */
		children: Snippet;
	}

	let { empty, emptyIcon, emptyText, emptyAction, headers, children }: Props = $props();
</script>

{#if empty}
	<div class="bg-base-200 flex flex-col items-center justify-center rounded-lg p-12">
		<i class="fas {emptyIcon} text-5xl opacity-50"></i>
		<p class="mt-4 text-lg opacity-70">{emptyText}</p>
		{@render emptyAction?.()}
	</div>
{:else}
	<div class="overflow-x-auto">
		<table class="table">
			<thead>
				<tr>
					{#each headers as header, i (i)}
						<th>{header}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{@render children()}
			</tbody>
		</table>
	</div>
{/if}
