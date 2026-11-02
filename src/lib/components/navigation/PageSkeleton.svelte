<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { PAGE_SKELETON, type SkeletonLayout, type SkeletonNode } from './skeletonShapes';

	/**
	 * The placeholder a `PageBoundary` shows while a page's first data loads: grey blocks in the
	 * layout of the page (`skeleton`, see `skeletonShapes.ts`), so the eye already knows where
	 * things will be.
	 *
	 * It stays invisible for its first moments (`page-skeleton` in `app.css`): a page whose data is
	 * cached resolves within a frame or two and would only flash it.
	 */
	let { skeleton = PAGE_SKELETON }: { skeleton?: SkeletonLayout } = $props();
</script>

{#snippet node({ class: classes, children }: SkeletonNode)}
	{#if children}
		<div class={classes}>
			{#each children as child, index (index)}
				{@render node(child)}
			{/each}
		</div>
	{:else}
		<div class="skeleton {classes}"></div>
	{/if}
{/snippet}

<div
	class="page-skeleton w-full min-w-0"
	role="status"
	aria-busy="true"
	aria-label={m.a11yLoadingPage()}
	data-skeleton={skeleton.name}
>
	{#each skeleton.nodes as child, index (index)}
		{@render node(child)}
	{/each}
</div>
