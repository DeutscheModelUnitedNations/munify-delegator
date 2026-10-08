<script lang="ts">
	import type { PaginationState } from '$lib/components/tanStackTable';
	import { m } from '$lib/paraglide/messages';

	/**
	 * The slice of a v9 table this component drives. A structural type rather than
	 * `Table<TFeatures, TData>`: feature APIs only exist on a table whose concrete
	 * features include pagination and filtering, which a generic `TFeatures` cannot
	 * express. Any table registering `rowPaginationFeature` and
	 * `columnFilteringFeature` satisfies it.
	 */
	interface PaginatedTable {
		atoms: { pagination: { get: () => PaginationState } };
		getPageCount: () => number;
		getFilteredRowModel: () => { rows: ArrayLike<unknown> };
		setPageSize: (pageSize: number) => void;
		firstPage: () => void;
		previousPage: () => void;
		nextPage: () => void;
		lastPage: () => void;
		getCanPreviousPage: () => boolean;
		getCanNextPage: () => boolean;
	}

	interface Props {
		table: PaginatedTable;
		pageSizeOptions?: number[];
		/** Rows come one page at a time from the backend, which only says whether another follows */
		serverMode?: boolean;
		/** With `serverMode`: the number of rows in all, where the backend counted them */
		rowCount?: number;
	}

	let {
		table,
		pageSizeOptions = [10, 20, 50, 100],
		serverMode = false,
		rowCount
	}: Props = $props();

	const pagination = $derived(table.atoms.pagination.get());
	const pageIndex = $derived(pagination.pageIndex);
	const pageCount = $derived(table.getPageCount());
	const pageSize = $derived(pagination.pageSize);
	const totalRows = $derived(table.getFilteredRowModel().rows.length);
</script>

<div class="flex flex-wrap items-center justify-between gap-4 px-2 py-3">
	<div class="text-base-content/70 text-sm">
		{#if serverMode}
			{rowCount ?? pageSize}
			{m.entries()}
		{:else}
			{totalRows}
			{m.entries()}
		{/if}
	</div>

	<div class="flex items-center gap-4">
		<div class="flex items-center gap-2">
			<select
				class="select select-bordered select-sm"
				value={pageSize}
				onchange={(e) => {
					table.setPageSize(Number(e.currentTarget.value));
				}}
			>
				{#each pageSizeOptions as size (size)}
					<option value={size}>{size}</option>
				{/each}
			</select>
		</div>

		<div class="join">
			<button
				class="join-item btn btn-sm"
				aria-label="First page"
				onclick={() => table.firstPage()}
				disabled={!table.getCanPreviousPage()}
			>
				<i class="fa-sharp-duotone fa-solid fa-angles-left"></i>
			</button>
			<button
				class="join-item btn btn-sm"
				aria-label="Previous page"
				onclick={() => table.previousPage()}
				disabled={!table.getCanPreviousPage()}
			>
				<i class="fa-sharp-duotone fa-solid fa-angle-left"></i>
			</button>
			<button class="join-item btn btn-sm pointer-events-none">
				{#if serverMode && rowCount === undefined}{pageIndex + 1}{:else}{pageIndex + 1} / {pageCount}{/if}
			</button>
			<button
				class="join-item btn btn-sm"
				aria-label="Next page"
				onclick={() => table.nextPage()}
				disabled={!table.getCanNextPage()}
			>
				<i class="fa-sharp-duotone fa-solid fa-angle-right"></i>
			</button>
			{#if !serverMode || rowCount !== undefined}
				<button
					class="join-item btn btn-sm"
					aria-label="Last page"
					onclick={() => table.lastPage()}
					disabled={!table.getCanNextPage()}
				>
					<i class="fa-sharp-duotone fa-solid fa-angles-right"></i>
				</button>
			{/if}
		</div>
	</div>
</div>
