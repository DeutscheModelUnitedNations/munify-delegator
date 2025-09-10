<script lang="ts">
	import CookieBanner from '$lib/components/CookieBanner.svelte';
	import Footer from './Footer.svelte';
	import { Toaster } from 'svelte-french-toast';
	import Inspect from 'svelte-inspect-value';

	// import GlobalErrorToast from '$lib/components/ErrorToast.svelte';
	// import CookieBanner from '$lib/components/CookieBanner.svelte';

	// global stylesheet
	import '../app.css';

	// various fonts
	import '@fontsource/outfit/100.css';
	import '@fontsource/outfit/200.css';
	import '@fontsource/outfit/300.css';
	import '@fontsource/outfit/400.css';
	import '@fontsource/outfit/500.css';
	import '@fontsource/outfit/600.css';
	import '@fontsource/outfit/700.css';
	import '@fontsource/outfit/800.css';
	import '@fontsource/outfit/900.css';
	import '@fontsource/roboto-mono/100.css';
	import '@fontsource/roboto-mono/200.css';
	import '@fontsource/roboto-mono/300.css';
	import '@fontsource/roboto-mono/400.css';
	import '@fontsource/roboto-mono/500.css';
	import '@fontsource/roboto-mono/600.css';
	import '@fontsource/roboto-mono/700.css';
	import '@fontsource/vollkorn/400.css';
	import '@fontsource/vollkorn/500.css';
	import '@fontsource/vollkorn/600.css';
	import '@fontsource/vollkorn/700.css';
	import '@fontsource/vollkorn/800.css';
	import '@fontsource/vollkorn/900.css';

	// flag icons
	import 'flag-icons/css/flag-icons.min.css';
	import { browser, dev } from '$app/environment';
	import type { LayoutProps } from './$types';

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
	<title>MUNify Delegator</title>
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
<div class="flex min-h-screen">
	<!-- {@render children()} -->
	<!--TODO https://github.com/HoudiniGraphql/houdini/issues/1369 -->
	{@render children()}
</div>
<Footer />

{#if dev}
	<Inspect.Panel />
{/if}
