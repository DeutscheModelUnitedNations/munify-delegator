<script lang="ts">
	import { m } from '$lib/paraglide/messages';
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

	const icon = $derived.by(() => {
		if (!active) return 'fa-sort opacity-30';
		return descending ? 'fa-sort-down' : 'fa-sort-up';
	});
</script>

<svelte:element
	this={pinned ? 'th' : 'td'}
	class="bg-base-200 {pinned ? 'z-20' : ''} {className}"
	aria-sort={active ? (descending ? 'descending' : 'ascending') : 'none'}
>
	<button
		class="inline-flex items-center gap-1 font-semibold hover:underline"
		title={m.seatPlanningSortBy({ column: label })}
		onclick={onSort}
	>
		{@render children()}
		<i class="fa-duotone {icon} text-xs"></i>
	</button>
</svelte:element>
