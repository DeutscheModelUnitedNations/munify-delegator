<script lang="ts">
	import { ParaglideJS } from '@inlang/paraglide-sveltekit'
	import { i18n } from '$lib/i18n'

	import { setLocale } from '$i18n/i18n-svelte';
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
	import type { LayoutData } from './$types';

	let { data }: { data: LayoutData } = $props();

	setLocale(data.locale ?? 'de');
</script>
<ParaglideJS {i18n}>


<slot />

</ParaglideJS>