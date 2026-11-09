<script lang="ts">
	import { navigating } from '$app/state';
	import { fade } from 'svelte/transition';
	import { m } from '#lib/paraglide/messages';

	/**
	 * A thin bar along the top edge while a navigation is under way: from the click until the next
	 * page is on screen (its route guard, its code, its first render). It shows up only after a
	 * short delay (see `nav-progress` in `app.css`), so a navigation that finishes at once, which
	 * most do, never flashes it.
	 */
	const busy = $derived(navigating.to !== null);
</script>

{#if busy}
	<div
		class="nav-progress pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
		role="progressbar"
		aria-label={m.a11yLoadingPage()}
		out:fade={{ duration: 200 }}
	>
		<div class="nav-progress-bar bg-primary h-full"></div>
	</div>
{/if}
