<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import LoadError from '#lib/components/LoadError.svelte';

	/** One topic of the overview in short, with the way to the tab that has all of it. */
	interface Props {
		title: string;
		/** Phosphor icon name (without the `ph-` prefix) */
		icon: string;
		onopen?: () => void;
		children: Snippet;
	}

	let { title, icon, onopen, children }: Props = $props();
</script>

<section class="bg-base-200 rounded-box flex min-w-0 flex-col gap-2 p-4 text-sm">
	<div class="flex items-center gap-2">
		<i aria-hidden="true" class="ph-duotone ph-{icon} text-base-content/60"></i>
		<h3 class="min-w-0 flex-1 font-bold">{title}</h3>
		{#if onopen}
			<button
				type="button"
				class="link link-hover link-primary text-xs"
				aria-label="{m.open()}: {title}"
				onclick={onopen}
			>
				{m.open()}
			</button>
		{/if}
	</div>
	<!-- A tile that fails leaves the others standing -->
	<svelte:boundary>
		{@render children()}
		{#snippet failed(_error, reset)}
			<LoadError onretry={reset} />
		{/snippet}
	</svelte:boundary>
</section>
