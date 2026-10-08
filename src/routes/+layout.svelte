<script lang="ts">
	import CookieBanner from '$lib/components/CookieBanner.svelte';
	import MaintenanceBanner from '$lib/components/MaintenanceBanner.svelte';
	import Footer from './Footer.svelte';
	import { Toaster } from 'svelte-sonner';
	import Inspect from 'svelte-inspect-value';
	import { locales, localizeHref } from '$lib/paraglide/runtime';

	// import GlobalErrorToast from '$lib/components/ErrorToast.svelte';
	// import CookieBanner from '$lib/components/CookieBanner.svelte';

	// global stylesheet
	import '../app.css';

	// flag icons
	import 'flag-icons/css/flag-icons.min.css';
	import { dev } from '$app/environment';
	import type { LayoutProps } from './$types';
	import { page } from '$app/state';
	import DevTools from '$lib/components/DevTools.svelte';
	import { onMount } from 'svelte';

	let { children }: LayoutProps = $props();

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
	<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
	<meta name="msapplication-TileColor" content="#ffffff" />
	<meta name="theme-color" content="#ffffff" />
</svelte:head>

<Toaster richColors position="top-center" />
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
