<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { pageCount, pageRange } from '#lib/dataGrid/pagination';
	import PageButtons from './PageButtons.svelte';
	import PageSizeSelect from './PageSizeSelect.svelte';

	/** The pager under a table: the rows shown, the page size, and the pages. */
	interface Props {
		pageIndex: number;
		pageSize: number;
		total: number;
		shown: number;
		onpage: (index: number) => void;
		onpagesize?: (size: number) => void;
		/** Small, inside a group of a grouped table */
		compact?: boolean;
	}

	let { pageIndex, pageSize, total, shown, onpage, onpagesize, compact = false }: Props = $props();

	const pages = $derived(pageCount({ total, pageSize }));
	const range = $derived(pageRange({ pageIndex, pageSize, shown }));
</script>

<nav
	class="no-print flex flex-wrap items-center justify-between gap-3 px-2"
	class:py-1={compact}
	class:py-3={!compact}
	aria-label={m.dataGridPagination()}
>
	<span class="text-base-content/70 text-sm tabular-nums">
		{m.dataGridRowRange({ from: range.from, to: range.to, total })}
	</span>
	<div class="flex items-center gap-3">
		{#if onpagesize}
			<PageSizeSelect {pageSize} label={m.dataGridPageSize()} {onpagesize} />
		{/if}
		{#if pages > 1}
			<PageButtons {pageIndex} {pages} size={compact ? 'btn-xs' : 'btn-sm'} {onpage} />
		{/if}
	</div>
</nav>
