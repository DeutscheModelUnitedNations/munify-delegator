<script lang="ts">
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n } from '$lib/i18n';

	import '../app.css';
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
	import 'flag-icons/css/flag-icons.min.css';
	import { onMount, type Snippet } from 'svelte';
	import GlobalErrorToast from '$lib/components/ErrorToast.svelte';
	import CookieBanner from '$lib/components/CookieBanner.svelte';

	let { children }: { children: Snippet } = $props();

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

	onMount(() => {
		changeFaDuotoneTheme();
		const colorSchemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		colorSchemeMediaQuery.addEventListener('change', changeFaDuotoneTheme);
	});
</script>

<ParaglideJS {i18n}>
	{@render children()}
	<GlobalErrorToast />
	<CookieBanner />
</ParaglideJS>
