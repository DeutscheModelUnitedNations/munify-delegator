<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/env';
	import { isNetworkError } from '#lib/api/errorCodes';
	import LoadError from '#lib/components/LoadError.svelte';
	import { logger } from '#lib/logger';
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
	 *
	 * A page whose fetch fails shows a retry here. Without a `failed` snippet the error escaped to
	 * the root, and Svelte (5.57) still ran the page's template after the failed `await`, against
	 * script variables that were never assigned, which crashed the page a second time.
	 */
	let { key, skeleton, children }: { key: string; skeleton?: SkeletonLayout; children: Snippet } =
		$props();

	function logFailure(error: unknown) {
		// a dropped connection is the visitor's, not a bug
		if (isNetworkError(error)) logger.warn('A page could not reach the API', error);
		else logger.error('A page failed to load', error);
	}
</script>

{#key key}
	<svelte:boundary pending={browser ? placeholder : undefined} onerror={logFailure}>
		{@render children()}

		{#snippet failed(_error, reset)}
			<div class="w-full p-4">
				<LoadError onretry={reset} />
			</div>
		{/snippet}
	</svelte:boundary>
{/key}

{#snippet placeholder()}
	<PageSkeleton {skeleton} />
{/snippet}
