<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		/** Page heading */
		title: string;
		/** Explanation under the heading */
		description: Snippet;
	}

	let { title, description }: Props = $props();

	let showInstructions = $state(false);
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between gap-2">
		<h2 class="text-2xl leading-none font-bold">{title}</h2>
		<!-- On a phone the explanation (mostly keyboard shortcuts) folds away to leave room for the camera -->
		<button
			class="btn btn-circle btn-ghost btn-sm md:hidden"
			onclick={() => (showInstructions = !showInstructions)}
			aria-expanded={showInstructions}
			aria-label={m.showInstructions()}
			title={m.showInstructions()}
		>
			<i class="fa-sharp-duotone fa-solid fa-circle-info text-xl"></i>
		</button>
	</div>
	{#if showInstructions}
		<p class="text-sm leading-relaxed text-base-content/70 md:hidden" transition:slide>
			{@render description()}
		</p>
	{/if}
	<p class="hidden leading-relaxed text-base-content/70 md:block">{@render description()}</p>
</div>
