<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { setHeaderStatus } from '$lib/state/authenticatedHeaderStatus.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	/** Only the mobile drawer opens and closes; from `sm` up the menu is always shown. */
	let mobileOpen = $state(false);

	$effect(() => {
		if (!mobileOpen) {
			setHeaderStatus({
				openNavCallback: () => {
					mobileOpen = true;
				}
			});
		}
	});

	afterNavigate(() => {
		mobileOpen = false;
	});
</script>

<!-- Both stay mounted on mobile so they can transition; `invisible` takes the closed drawer out of
the tab order and the accessibility tree once the slide has finished. -->
<button
	aria-label="Close navigation drawer"
	aria-hidden="true"
	tabindex="-1"
	class="fixed top-0 left-0 z-40 h-full w-full bg-black transition-opacity duration-200 sm:hidden {mobileOpen
		? 'opacity-40'
		: 'pointer-events-none opacity-0'}"
	onclick={() => (mobileOpen = false)}
></button>

<div
	class="fixed top-0 left-0 z-50 h-full py-4 pl-3 transition-[translate,visibility] duration-200 ease-out sm:visible sm:sticky sm:z-20 sm:top-[var(--header-height,0px)] sm:h-[calc(100dvh-var(--header-height,0px))] sm:w-60 sm:shrink-0 sm:translate-x-0 sm:py-0 sm:pl-0 sm:transition-none {mobileOpen
		? 'translate-x-0'
		: 'invisible -translate-x-full'}"
>
	<div
		class="bg-base-100 rounded-box h-full w-60 overflow-y-auto px-3 py-2 shadow-lg sm:bg-transparent sm:shadow-none"
	>
		{@render children()}
	</div>
</div>
