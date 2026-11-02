<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { SKELETON_LAYOUTS, type SkeletonShape } from './skeletonShapes';

	/**
	 * The placeholder a `PageBoundary` shows while a page's first data loads: grey blocks in the
	 * rough layout of the page (`shape`, drawn from `SKELETON_LAYOUTS`), so the eye already knows
	 * where things will be.
	 *
	 * It stays invisible for its first moments (`page-skeleton` in `app.css`): a page whose data is
	 * cached resolves within a frame or two and would only flash it.
	 */
	let { shape = 'page' }: { shape?: SkeletonShape } = $props();

	const rows = $derived(SKELETON_LAYOUTS[shape]);
</script>

<div
	class="page-skeleton flex w-full flex-col gap-4 py-4"
	role="status"
	aria-busy="true"
	aria-label={m.a11yLoadingPage()}
	data-skeleton={shape}
>
	{#each rows as { row, blocks }, index (index)}
		<div class={row}>
			{#each blocks as block, blockIndex (blockIndex)}
				<div class="skeleton {block}"></div>
			{/each}
		</div>
	{/each}
</div>
