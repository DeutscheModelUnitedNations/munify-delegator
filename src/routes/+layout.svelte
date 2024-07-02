<script lang="ts">
	import { setLocale } from '$i18n/i18n-svelte';
	import '../app.css';
	import type { LayoutData } from './$types'

	export let data: LayoutData;

	setLocale(data.locale ?? "de");
</script>

<slot />