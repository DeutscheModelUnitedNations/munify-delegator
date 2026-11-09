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
	import { dev } from '$app/env';
	import type { LayoutProps } from './$types';
	import { page } from '$app/state';
	import DevTools from '#lib/components/DevTools.svelte';
	import NavigationProgress from '#lib/components/navigation/NavigationProgress.svelte';
	import { enableViewTransitionApi } from '#lib/helpers/viewTransitionApi.svelte';
	import { onMount } from 'svelte';
	import { SPLASH_SCREENS } from '#lib/pwa/splashScreens';

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
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}MUNify Delegator</title>
	<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
	<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
	<link rel="manifest" href="/site.webmanifest" />
	<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#3D7DD2" />
	<meta name="msapplication-TileColor" content="#FFFFFF" />
	<!-- The installed app's title bar takes the header's colour (base-100 of the DMUN themes), as in CHASE -->
	<meta name="theme-color" media="(prefers-color-scheme: light)" content="#FFFFFF" />
	<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1B1837" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-title" content="DELEGATOR" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	{#each SPLASH_SCREENS as screen (screen.file)}
		<link rel="apple-touch-startup-image" href="/{screen.file}" media={screen.media} />
	{/each}
</svelte:head>

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
