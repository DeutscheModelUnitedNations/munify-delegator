<script lang="ts">
	import CookieBanner from '$lib/components/CookieBanner.svelte';
	import MaintenanceBanner from '$lib/components/MaintenanceBanner.svelte';
	import Footer from './Footer.svelte';
	import { Toaster } from 'svelte-french-toast';
	import Inspect from 'svelte-inspect-value';
	import { locales, localizeHref } from '$lib/paraglide/runtime';

	// import GlobalErrorToast from '$lib/components/ErrorToast.svelte';
	// import CookieBanner from '$lib/components/CookieBanner.svelte';

	// global stylesheet
	import '../app.css';

	// flag icons
	import 'flag-icons/css/flag-icons.min.css';
	import { browser, dev } from '$app/environment';
	import type { LayoutProps } from './$types';
	import { page } from '$app/state';
	import DevTools from '$lib/components/DevTools.svelte';

	let { children }: LayoutProps = $props();

	const changeFaDuotoneTheme = () => {
		const r = document.querySelector(':root');
		if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			(r as any)?.style.setProperty('--fa-primary-color', '#b1cbed');
			(r as any)?.style.setProperty('--fa-primary-opacity', '1');
			(r as any)?.style.setProperty('--fa-secondary-color', '#3d7dd2');
			(r as any)?.style.setProperty('--fa-secondary-opacity', '1');
		} else {
			(r as any)?.style.setProperty('--fa-primary-color', '#000000');
			(r as any)?.style.setProperty('--fa-primary-opacity', '1');
			(r as any)?.style.setProperty('--fa-secondary-color', '#3d7dd2');
			(r as any)?.style.setProperty('--fa-secondary-opacity', '1');
		}

		//--fa-primary-opacity: 1;
		// --fa-secondary-color: #3d7dd2;
		// --fa-secondary-opacity: 1;
	};

	if (browser) {
		changeFaDuotoneTheme();
		const colorSchemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		colorSchemeMediaQuery.addEventListener('change', changeFaDuotoneTheme);
	}
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

<Toaster />
<CookieBanner />
<MaintenanceBanner />
<div class="flex min-h-screen">
	<!-- {@render children()} -->
	<!--TODO https://github.com/HoudiniGraphql/houdini/issues/1369 -->
	{@render children()}
</div>
<Footer />

{#if dev}
	<Inspect.Panel />
	<DevTools />
{/if}

<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>
