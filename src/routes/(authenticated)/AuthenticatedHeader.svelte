<script lang="ts">
	import { dev } from '$app/environment';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { IMPERSONATION_ENABLED } from '$lib/data/impersonation';
	import { openCommandPalette } from '$lib/components/commandPalette/commandPaletteState.svelte';
	import Kbd from '$lib/components/Kbd.svelte';
	import { headerState } from '$lib/state/authenticatedHeaderStatus.svelte';
	import { page } from '$app/stores';
	import Breadcrumbs from './Breadcrumbs.svelte';
	import ImpersonationButton from './ImpersonationButton.svelte';
	import UserMenu from './UserMenu.svelte';

	//TODO
	// import ExportButtons from '$lib/components/dataTable/ExportButtons.svelte';
	// import SettingsButton from './DataTable/SettingsButton.svelte';

	function fetchImpersonationStatus() {
		return client.query.impersonationStatus({
			isImpersonating: true,
			originalUser: { sub: true, email: true },
			impersonatedUser: { sub: true, email: true }
		});
	}

	let impersonationStatus = $state<Awaited<ReturnType<typeof fetchImpersonationStatus>>>();

	let isImpersonating = $derived(impersonationStatus?.isImpersonating || false);

	/** Impersonating someone turns the header yellow; the dev server turns it red. */
	let highlightClass = $derived.by(() => {
		if (isImpersonating)
			return 'shadow-[0_0_15px_rgba(234,179,8,0.6)] border-yellow-500 !bg-yellow-200/70 dark:!bg-yellow-900/50';
		if (dev)
			return 'shadow-[0_0_15px_rgba(255,0,0,0.6)] border-red-500 !bg-red-200/70 dark:!bg-red-900/50';
		return '';
	});

	$effect(() => {
		// Stalled: the API always reports "not impersonating", so asking is a wasted round trip.
		if (IMPERSONATION_ENABLED) {
			void fetchImpersonationStatus().then((status) => {
				impersonationStatus = status;
			});
		}
	});
</script>

<div class="w-full p-4">
	<div
		class="no-print navbar bg-base-200 border-base-300 border-1 mb-4 justify-between gap-0 rounded-box px-4 py-2 sm:gap-2 {highlightClass}"
	>
		{#if headerState.openNavCallback !== undefined}
			<button
				class="sm:hidden"
				aria-label="Toggle navigation menu"
				onclick={() => {
					headerState.openNavCallback?.();
					headerState.openNavCallback = undefined;
				}}
			>
				<i class="fa-duotone fa-bars mr-3 text-xl"></i>
			</button>
		{/if}

		<Breadcrumbs />

		<div class="flex items-center gap-1">
			{#if isImpersonating}
				<ImpersonationButton
					impersonatedEmail={impersonationStatus?.impersonatedUser?.email}
					originalEmail={impersonationStatus?.originalUser?.email}
				/>
			{/if}

			{#if $page.url.pathname.includes('/management/')}
				<button
					class="btn btn-ghost btn-sm hidden gap-2 text-base-content/60 sm:flex"
					onclick={openCommandPalette}
				>
					<i class="fa-duotone fa-magnifying-glass"></i>
					<span class="text-sm">{m.search()}</span>
					<Kbd hotkey="mod+k" size="xs" />
				</button>
			{/if}

			<UserMenu />
		</div>
	</div>
</div>
