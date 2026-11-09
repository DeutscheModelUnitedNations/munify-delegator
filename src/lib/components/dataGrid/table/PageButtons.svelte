<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { pageWindow } from '#lib/dataGrid/pagination';

	/** The pages to jump to: previous, the window around the current one, next. */
	interface Props {
		pageIndex: number;
		pages: number;
		size: 'btn-xs' | 'btn-sm';
		onpage: (index: number) => void;
	}

	let { pageIndex, pages, size, onpage }: Props = $props();

	const buttons = $derived(pageWindow({ current: pageIndex + 1, pages }));
</script>

<div class="join">
	<button
		class="join-item btn {size}"
		aria-label={m.a11yPreviousPage()}
		disabled={pageIndex === 0}
		onclick={() => onpage(pageIndex - 1)}
	>
		<i aria-hidden="true" class="ph-duotone ph-caret-left"></i>
	</button>
	{#each buttons as page, i (page ?? `gap-${i}`)}
		{#if page === null}
			<span class="join-item btn btn-disabled {size}">…</span>
		{:else}
			<button
				class="join-item btn {size}"
				class:btn-active={page === pageIndex + 1}
				aria-current={page === pageIndex + 1 ? 'page' : undefined}
				onclick={() => onpage(page - 1)}
			>
				{page}
			</button>
		{/if}
	{/each}
	<button
		class="join-item btn {size}"
		aria-label={m.a11yNextPage()}
		disabled={pageIndex >= pages - 1}
		onclick={() => onpage(pageIndex + 1)}
	>
		<i aria-hidden="true" class="ph-duotone ph-caret-right"></i>
	</button>
</div>
