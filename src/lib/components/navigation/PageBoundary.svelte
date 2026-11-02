<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/env';
	import PageSkeleton from './PageSkeleton.svelte';
	import type { SkeletonLayout } from './skeletonShapes';

	/**
	 * Wraps the pages a layout renders so a client-side navigation shows the next page's skeleton
	 * at once instead of keeping the old page on screen until the new one's data has arrived.
	 *
	 * Pages fetch at the top of their `<script>`, and an `await` outside any boundary holds the
	 * whole update back. A `<svelte:boundary>` with a `pending` snippet scopes that wait to its
	 * contents - but only the first time it renders, so the boundary is re-created for every new
	 * `key` (the pathname; see `#lib/helpers/boundaryKey` for layouts whose sections keep a frame).
	 *
	 * The snippet is only handed over in the browser: on the server a boundary with a `pending`
	 * snippet renders nothing but that snippet, and a full page load is still meant to arrive with
	 * its content. The client then hydrates the rendered content as usual, and the skeleton only
	 * appears from the first navigation on.
	 */
	let { key, skeleton, children }: { key: string; skeleton?: SkeletonLayout; children: Snippet } =
		$props();
</script>

{#key key}
	<svelte:boundary pending={browser ? placeholder : undefined}>
		{@render children()}
	</svelte:boundary>
{/key}

{#snippet placeholder()}
	<PageSkeleton {skeleton} />
{/snippet}
