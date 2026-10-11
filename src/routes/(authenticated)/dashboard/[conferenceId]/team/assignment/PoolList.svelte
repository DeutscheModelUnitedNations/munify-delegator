<script lang="ts" generics="T">
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import VirtualList from 'svelte-virtual-list';

	/**
	 * The rows of a pool that is loaded a page at a time. Only the rows in view are in the DOM;
	 * scrolling to the end asks for the next page. A pool too short to scroll (a rare group size)
	 * loads more by its button instead, so it never walks the whole conference by itself.
	 */
	interface Props {
		items: T[];
		/** Whether there are pages left to load. */
		more: boolean;
		/** The first page is on its way. */
		loading?: boolean;
		onLoadMore: () => void;
		row: Snippet<[T]>;
	}

	let { items, more, loading = false, onLoadMore, row }: Props = $props();

	/** Fewer rows than this hardly scroll, so they do not load more by scrolling. */
	const SCROLLING_ROWS = 20;
	/** The last row in view. */
	let end = $state(0);
	$effect(() => {
		if (more && items.length >= SCROLLING_ROWS && end >= items.length - 5) onLoadMore();
	});
</script>

<!--
	As tall as the space it is given on a wide screen (the pool section is one screen high there);
	stacked above the roles on a narrow one, a fixed share of the screen.
-->
<div class="flex h-[60vh] min-h-0 flex-col xl:h-auto xl:flex-1">
	{#if loading}
		<div class="flex justify-center py-6" role="status">
			<span class="loading loading-spinner loading-md text-primary"></span>
		</div>
	{:else if items.length > 0}
		<div class="min-h-0 flex-1">
			<VirtualList {items} height="100%" bind:end let:item>
				<div class="pb-2">
					{@render row(item)}
				</div>
			</VirtualList>
		</div>
	{/if}
	<!-- Only where scrolling cannot ask for more: a pool too short to scroll. -->
	{#if more && !loading && items.length < SCROLLING_ROWS}
		<button class="btn btn-ghost btn-sm mt-2 w-full shrink-0" onclick={onLoadMore}>
			<i class="fa-sharp-duotone fa-solid fa-arrow-down"></i>
			{m.assignmentPoolLoadMore()}
		</button>
	{/if}
</div>
