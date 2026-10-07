<script lang="ts">
	import { dev } from '$app/environment';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { IMPERSONATION_ENABLED } from '$lib/data/impersonation';
	import { openCommandPalette } from '$lib/components/commandPalette/commandPaletteState.svelte';
	import Kbd from '$lib/components/Kbd.svelte';
	import { headerState } from '$lib/state/authenticatedHeaderStatus.svelte';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
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

	/** A thin strip on top of the bar: yellow while impersonating, red on the dev server. */
	let stripClass = $derived(isImpersonating ? 'bg-yellow-500' : dev ? 'bg-red-500' : '');

	$effect(() => {
		// Stalled: the API always reports "not impersonating", so asking is a wasted round trip.
		if (IMPERSONATION_ENABLED) {
			void fetchImpersonationStatus().then((status) => {
				impersonationStatus = status;
			});
		}
	});
</script>

<header
	class="no-print bg-base-100/90 border-base-300 sticky top-0 z-30 w-full border-b backdrop-blur"
>
	{#if stripClass}
		<div class="h-0.5 w-full {stripClass}"></div>
	{/if}
	<div
		class="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 md:px-8"
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
				<i class="fa-duotone fa-bars text-xl"></i>
			</button>
		{/if}

		<a class="text-lg leading-none" href={resolve('/dashboard')}>
			<span class="font-light">MUNify</span> <span class="font-bold">DELEGATOR</span>
		</a>

		<div class="order-last w-full min-w-0 md:order-none md:w-auto md:flex-1">
			<Breadcrumbs />
		</div>
		<div class="flex-1 md:hidden"></div>

		<div class="flex items-center gap-2">
			{#if isImpersonating}
				<ImpersonationButton
					impersonatedEmail={impersonationStatus?.impersonatedUser?.email}
					originalEmail={impersonationStatus?.originalUser?.email}
				/>
			{/if}

			{#if $page.url.pathname.includes('/management/')}
				<button
					class="btn btn-ghost btn-sm text-base-content/60 hidden gap-2 sm:flex"
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
</header>
