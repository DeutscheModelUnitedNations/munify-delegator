<script lang="ts" generics="E extends { group?: string }">
	import type { Snippet } from 'svelte';
	import { groupEntries } from '$lib/components/tanStackTable/columnEntries';

	interface Props {
		/** The columns to list, each with the group it is listed under */
		entries: E[];
		/** Group headings in the order they are listed in; others follow as the columns come */
		groupOrder?: string[];
		/** Classes for the list of one group */
		listClass: string;
		/** Classes for the wrapper of one group */
		groupClass?: string;
		/** One column */
		item: Snippet<[entry: E]>;
	}

	let { entries, groupOrder = [], listClass, groupClass = '', item }: Props = $props();

	/** Columns without a group come first and get no heading. */
	const groups = $derived(groupEntries(entries, groupOrder));
</script>

{#each groups as [heading, members] (heading ?? '')}
	<section class={groupClass}>
		{#if heading}
			<h3 class="mb-3 text-xs font-semibold tracking-wider text-base-content/60 uppercase">
				{heading}
			</h3>
		{/if}
		<div class={listClass}>
			{#each members as entry (entry)}
				{@render item(entry)}
			{/each}
		</div>
	</section>
{/each}
