<script lang="ts">
	import { dev } from '$app/env';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import {
		openCommandPalette,
		isCommandPaletteAvailable
	} from '#lib/components/commandPalette/commandPaletteState.svelte.js';
	import Kbd from '#lib/components/Kbd.svelte';
	import { getAvailableHandoff } from '#lib/components/commandPalette/searchHistory.svelte.js';
	import { headerState } from '#lib/state/authenticatedHeaderStatus.svelte.js';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Breadcrumbs from './Breadcrumbs.svelte';
	import ImpersonationButton from './ImpersonationButton.svelte';
	import UserMenu from './UserMenu.svelte';

	//TODO
	// import ExportButtons from '#lib/components/dataTable/ExportButtons.svelte';
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
		void fetchImpersonationStatus().then((status) => {
			impersonationStatus = status;
		});
	});

	let titleScroller = $state<HTMLDivElement>();

	// On mobile the title and breadcrumbs share one row that scrolls horizontally; keep the end
	// (the current page) in view initially and whenever the crumbs change (navigation, lazily
	// loaded titles).
	$effect(() => {
		const scroller = titleScroller;
		if (!scroller) return;
		const scrollToEnd = () => {
			scroller.scrollLeft = scroller.scrollWidth;
		};
		scrollToEnd();
		const observer = new MutationObserver(scrollToEnd);
		observer.observe(scroller, { childList: true, subtree: true, characterData: true });
		return () => observer.disconnect();
	});

	let headerHeight = $state(0);

	// The side navigation sticks below the header, so it needs to know how tall the header is
	$effect(() => {
		document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
		return () => document.documentElement.style.removeProperty('--header-height');
	});
</script>

<header
	bind:clientHeight={headerHeight}
	class="no-print bg-base-100/80 sticky top-0 z-30 w-full backdrop-blur"
>
	{#if stripClass}
		<div class="h-0.5 w-full {stripClass}"></div>
	{/if}
	<div
		class="mx-auto flex w-full max-w-[1800px] items-center gap-x-4 px-4 py-2 md:flex-wrap md:gap-y-1 md:px-8"
	>
		{#if headerState.openNavCallback !== undefined}
			<button
				class="shrink-0 sm:hidden"
				aria-label={m.a11yToggleNavigation()}
				onclick={() => {
					headerState.openNavCallback?.();
					headerState.openNavCallback = undefined;
				}}
			>
				<i class="fa-sharp-duotone fa-solid fa-bars text-xl"></i>
			</button>
		{/if}

		<!-- On mobile the title and the breadcrumbs form one row that scrolls horizontally (the conference switcher's dropdown is portaled, so scrolling does not clip it). From md up the title stays put and the breadcrumbs overflow and wrap instead. Drop daisyUI's own separators since the breadcrumbs draw chevrons -->
		<div
			bind:this={titleScroller}
			class="flex min-w-0 flex-1 items-center gap-x-4 overflow-x-auto [scrollbar-width:none] md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden"
		>
			<a class="shrink-0 text-lg leading-none whitespace-nowrap" href={resolve('dashboard')}>
				<span class="font-light">MUNify</span>
				<span class="font-bold">DELEGATOR</span>
			</a>

			<div
				class="min-w-0 md:flex-1 [&_.breadcrumbs]:overflow-visible md:[&_.breadcrumbs>ul]:flex-wrap [&_.breadcrumbs>ul]:flex-nowrap [&_.breadcrumbs_li]:shrink-0 [&_.breadcrumbs_li]:before:hidden [&_.breadcrumbs_li]:after:hidden"
			>
				<Breadcrumbs />
			</div>
		</div>

		<div class="flex shrink-0 items-center gap-2">
			{#if isImpersonating}
				<ImpersonationButton
					impersonatedEmail={impersonationStatus?.impersonatedUser?.email}
					originalEmail={impersonationStatus?.originalUser?.email}
				/>
			{/if}

			{#if isCommandPaletteAvailable()}
				<button
					class="btn btn-ghost btn-circle btn-sm relative sm:hidden"
					aria-label={m.search()}
					onclick={openCommandPalette}
				>
					<i class="fa-sharp-duotone fa-solid fa-magnifying-glass"></i>
					{@render handoffBadge()}
				</button>
				<button
					class="btn btn-ghost btn-sm text-base-content/60 relative hidden gap-2 sm:flex"
					onclick={openCommandPalette}
				>
					{@render handoffBadge()}
					<i class="fa-sharp-duotone fa-solid fa-magnifying-glass"></i>
					<span class="text-sm">{m.search()}</span>
					<Kbd hotkey="mod+k" size="xs" />
				</button>
			{/if}

			<UserMenu />
		</div>
	</div>
</header>

{#snippet handoffBadge()}
	{#if getAvailableHandoff()}
		<span class="absolute top-0.5 right-0.5 flex size-2.5" title={m.searchHandoffAvailable()}>
			<span class="bg-warning absolute inline-flex size-full animate-ping rounded-full opacity-75"
			></span>
			<span class="bg-warning relative inline-flex size-2.5 rounded-full"></span>
		</span>
	{/if}
{/snippet}
