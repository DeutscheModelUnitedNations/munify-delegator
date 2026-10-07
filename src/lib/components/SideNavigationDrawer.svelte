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

{#if mobileOpen}
	<button
		aria-label="Close navigation drawer"
		aria-hidden="true"
		class="fixed top-0 left-0 z-10 h-full w-full bg-black opacity-40 sm:hidden"
		onclick={() => (mobileOpen = false)}
	></button>
{/if}

<div
	class="fixed top-0 left-0 z-20 h-full py-4 pl-3 sm:sticky sm:top-[var(--header-height,0px)] sm:h-[calc(100dvh-var(--header-height,0px))] sm:w-60 sm:shrink-0 sm:py-0 sm:pl-0 {mobileOpen
		? ''
		: 'hidden sm:block'}"
>
	<div
		class="bg-base-100 rounded-box h-full w-60 overflow-y-auto px-3 py-2 shadow-lg sm:bg-transparent sm:shadow-none"
	>
		{@render children()}
	</div>
</div>
