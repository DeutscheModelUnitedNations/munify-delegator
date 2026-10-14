<script>
	import { locales, getLocale, setLocale } from '$lib/paraglide/runtime';
	import Flag from './Flag.svelte';

	const alpha2CodeLookup = {
		en: 'gb'
	};
</script>

<div class="join gap-0">
	{#each locales as lang (lang)}
		<button
			class="btn join-item {getLocale() === lang ? 'btn-primary' : ''}"
			onclick={() => setLocale(lang)}
			aria-current={lang === getLocale() ? 'page' : undefined}
		>
			<Flag size="xs" alpha2Code={alpha2CodeLookup[lang] ?? lang} />
		</button>
	{/each}
</div>
