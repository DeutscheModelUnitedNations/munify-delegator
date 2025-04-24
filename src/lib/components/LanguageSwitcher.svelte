<script>
	import { locales, getLocale, localizeHref, setLocale } from '$lib/paraglide/runtime';
	import { page } from '$app/state';
</script>

<span class="flex">
	{#each locales as lang, i}
		<button
			class={getLocale() === lang ? 'font-bold' : ''}
			onclick={() => setLocale(lang)}
			aria-current={lang === getLocale() ? 'page' : undefined}
		>
			{lang.toUpperCase()}
		</button>
		{#if locales.length > i + 1}
			|
		{/if}
	{/each}
</span>
