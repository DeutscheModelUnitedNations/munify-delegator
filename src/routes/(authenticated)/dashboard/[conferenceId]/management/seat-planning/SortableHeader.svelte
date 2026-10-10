<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import SortButton from '$lib/components/tanStackTable/ui/SortButton.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		/** accessible name of the column */
		label: string;
		active: boolean;
		descending: boolean;
		onSort: () => void;
		/** only the state column is a `th`: `table-pin-cols` pins every `th` of a row */
		pinned?: boolean;
		class?: string;
		children: Snippet;
	}

	let {
		label,
		active,
		descending,
		onSort,
		pinned = false,
		class: className = '',
		children
	}: Props = $props();
</script>

<svelte:element
	this={pinned ? 'th' : 'td'}
	class="bg-base-200 {pinned ? 'z-20' : ''} {className}"
	aria-sort={active ? (descending ? 'descending' : 'ascending') : 'none'}
>
	<SortButton
		sorted={active ? (descending ? 'desc' : 'asc') : false}
		title={m.seatPlanningSortBy({ column: label })}
		onclick={onSort}
	>
		{@render children()}
	</SortButton>
</svelte:element>
