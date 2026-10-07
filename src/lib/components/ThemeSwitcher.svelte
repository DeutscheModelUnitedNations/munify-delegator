<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { theme, type ThemePreference } from '$lib/helpers/theme.svelte';

	const options: { value: ThemePreference; icon: string; label: string }[] = [
		{ value: 'light', icon: 'sun-bright', label: m.themeLight() },
		{ value: 'system', icon: 'circle-half-stroke', label: m.themeSystem() },
		{ value: 'dark', icon: 'moon', label: m.themeDark() }
	];
</script>

<div class="join gap-0" role="radiogroup" aria-label={m.theme()}>
	{#each options as option (option.value)}
		{@const active = theme.preference === option.value}
		<button
			class="btn join-item {active ? 'btn-primary' : ''}"
			role="radio"
			aria-checked={active}
			aria-label={option.label}
			title={option.label}
			onclick={() => theme.set(option.value)}
		>
			<i class="fa-{active ? 'solid' : 'duotone'} fa-{option.icon}"></i>
		</button>
	{/each}
</div>
