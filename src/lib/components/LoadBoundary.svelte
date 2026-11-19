<!--
	@component
	A part that fetches itself, with a spinner while it loads and `LoadError` (retry) when loading
	fails.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';
	import LoadError from '#lib/components/LoadError.svelte';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		/** Classes of the spinner's frame, which centres it. */
		pendingClass?: ClassValue;
		children: Snippet;
	}

	let { pendingClass = 'p-8', children }: Props = $props();
</script>

<svelte:boundary>
	{@render children()}
	{#snippet pending()}
		<div class={['flex items-center justify-center', pendingClass]}>
			<span class="loading loading-spinner" aria-label={m.genericToastLoading()}></span>
		</div>
	{/snippet}
	{#snippet failed(_error, reset)}
		<div class="p-4"><LoadError onretry={reset} /></div>
	{/snippet}
</svelte:boundary>
