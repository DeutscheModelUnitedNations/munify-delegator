<!--
	@component
	An open chat with what shows while it loads and when loading fails: `ChatThread` fetches
	itself, so whoever places one wraps it like this. Takes the thread's props.
-->
<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import { m } from '#lib/paraglide/messages';
	import ChatThread from './ChatThread.svelte';

	let props: ComponentProps<typeof ChatThread> = $props();
</script>

<svelte:boundary>
	<ChatThread {...props} />
	{#snippet pending()}
		<div class="flex h-full items-center justify-center">
			<span class="loading loading-spinner" aria-label={m.genericToastLoading()}></span>
		</div>
	{/snippet}
	{#snippet failed(_error, reset)}
		<div class="p-4"><LoadError onretry={reset} /></div>
	{/snippet}
</svelte:boundary>
