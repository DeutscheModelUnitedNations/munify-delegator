<script lang="ts">
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n } from '$lib/i18n';
	import CookieBanner from '$lib/components/CookieBanner.svelte';
	import Footer from './Footer.svelte';
	import { SvelteToast } from '@zerodevx/svelte-toast';

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

<ParaglideJS {i18n}>
	<SvelteToast options={{}} />
	<CookieBanner />
	<div class="h-screen flex">
		<!-- {@render children()} -->
		<!--TODO https://github.com/HoudiniGraphql/houdini/issues/1369 -->
		<slot />
	</div>
	<Footer />
</ParaglideJS>
