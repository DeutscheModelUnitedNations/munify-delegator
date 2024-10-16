<script>
	import '../app.css';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n } from '$lib/i18n';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
</script>

<ParaglideJS {i18n}>
	<slot></slot>
	<LanguageSwitcher />
</ParaglideJS>
