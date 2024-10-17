<script>
	import { availableLanguageTags, languageTag } from '$lib/paraglide/runtime';
	import { i18n } from '$lib/i18n';
	import { page } from '$app/stores';
</script>

<span class="flex">
	{#each availableLanguageTags as lang, i}
		<a
			class={languageTag() === lang ? 'font-bold' : ''}
			href={i18n.route($page.url.pathname)}
			hreflang={lang}
			aria-current={lang === languageTag() ? 'page' : undefined}
		>
			{lang.toUpperCase()}
		</a>
		{#if availableLanguageTags.length > i + 1}
			|
		{/if}
	{/each}
</span>
