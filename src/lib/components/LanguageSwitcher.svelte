<script>
	import { locales, getLocale, setLocale } from '#lib/paraglide/runtime';
	import Flag from './Flag.svelte';

	const alpha2CodeLookup = {
		en: 'gb'
	};

	/** Each language in its own words ("Deutsch", "English"), which is what a speaker of it looks for. */
	const ownName = (lang) => new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang;
</script>

<div class="join gap-0">
	{#each locales as lang (lang)}
		<button
			class="btn join-item {getLocale() === lang ? 'btn-primary' : ''}"
			onclick={() => setLocale(lang)}
			aria-pressed={lang === getLocale()}
			aria-label={ownName(lang)}
			{lang}
		>
			<Flag size="xs" alpha2Code={alpha2CodeLookup[lang] ?? lang} />
		</button>
	{/each}
</div>
