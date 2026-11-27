<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import SortButton from '#lib/components/table/SortButton.svelte';

	interface Props {
		label: string;
		numeric: boolean;
		/** How the table is sorted by this column, false while it is not. */
		sorted: false | 'asc' | 'desc';
		onSort: () => void;
	}

	let { label, numeric, sorted, onSort }: Props = $props();

	const ariaSort = $derived(
		sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
	);
</script>

<th class="bg-base-200 text-xs" aria-sort={ariaSort}>
	<SortButton
		class={numeric ? 'ml-auto' : ''}
		{sorted}
		title={m.seatPlanningSortBy({ column: label })}
		onclick={onSort}
	>
		{label}
	</SortButton>
</th>
