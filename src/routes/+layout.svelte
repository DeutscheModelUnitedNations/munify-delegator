<script lang="ts">
	import DialogHost from '#lib/components/DialogHost.svelte';
	import CookieBanner from '#lib/components/CookieBanner.svelte';
	import MaintenanceBanner from '#lib/components/MaintenanceBanner.svelte';
	import Footer from './Footer.svelte';
	import { Toaster } from 'svelte-sonner';
	import Inspect from 'svelte-inspect-value';
	import { locales, localizeHref } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';

	// import GlobalErrorToast from '#lib/components/ErrorToast.svelte';
	// import CookieBanner from '#lib/components/CookieBanner.svelte';

	// global stylesheet
	import '../app.css';

	// flag icons
	import 'flag-icons/css/flag-icons.min.css';
	import '@phosphor-icons/web/regular/style.css';
	import '@phosphor-icons/web/fill/style.css';
	import '@phosphor-icons/web/duotone/style.css';
	import { dev } from '$app/env';
	import type { LayoutProps } from './$types';
	import { page, updated } from '$app/state';
	import { beforeNavigate } from '$app/navigation';
	import DevTools from '#lib/components/DevTools.svelte';
	import NavigationProgress from '#lib/components/navigation/NavigationProgress.svelte';
	import { enableViewTransitionApi } from '#lib/helpers/viewTransitionApi.svelte';
	import { onMount } from 'svelte';
	import { BrandHead } from '@deutschemodelunitednations/munify-brand';

	let { children }: LayoutProps = $props();

	// Every client-side navigation cross-fades (see `app.css` for the timing and the named parts)
	enableViewTransitionApi();

	// Marks the document once the client has taken over the server-rendered page. The e2e suite
	// waits for it (`waitForHydration`): a click that lands before hydration attaches its handler is
	// lost, and `networkidle` - the obvious stand-in - never arrives while the subscription stream
	// is open.
	onMount(() => {
		document.body.dataset.hydrated = 'true';
	});

	// After a deploy, a tab still running the old build asks the API for fields that are gone
	// ("Cannot query field ...") and loads chunks that no longer exist ("Failed to fetch dynamically
	// imported module"). Once SvelteKit has noticed the new version, the next navigation loads it.
	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) location.href = to.url.href;
	});
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}MUNify Delegator</title>
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
</svelte:head>

<!-- Favicons, manifest, light and dark iOS launch images, social card. The theme colour (white,
navy) is base-100 of the DMUN themes, so the installed app's title bar takes the header's colour -->
<BrandHead product="delegator" origin={page.url.origin} />

<!-- The first thing Tab reaches: past the header and navigation, to the layout's <main> -->
<a
	href="#main-content"
	class="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100]"
>
	{m.a11ySkipToContent()}
</a>
<NavigationProgress />
<Toaster richColors position="top-center" />
<DialogHost />
<CookieBanner />
<MaintenanceBanner />
<div class="flex min-h-screen">
	{@render children()}
</div>
<Footer />

{#if dev}
	<Inspect.Panel />
	<DevTools />
{/if}

<div style="display:none">
	{#each locales as locale (locale)}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- localizeHref builds a locale-prefixed URL from the current pathname at runtime, which resolve() cannot type -->
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>
