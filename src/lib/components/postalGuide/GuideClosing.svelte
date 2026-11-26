<!-- The end of the postal guide: everything once more, as a list. -->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import GuideWarning from './GuideWarning.svelte';
	import { GUIDE_STEPS } from './steps';

	const lines = GUIDE_STEPS.flatMap(({ done }) => done ?? []);
</script>

<ul class="mt-4 grid gap-2 text-left sm:grid-cols-2">
	{#each lines as { icon, text, dont } (icon)}
		<li class="flex items-center gap-2">
			<i
				aria-hidden="true"
				class="ph-duotone ph-{icon} text-xl {dont ? 'text-error' : 'text-success'}"
			></i>
			<span>{text()}</span>
		</li>
	{/each}
</ul>
<GuideWarning text={m.postalGuideWarning()} />
