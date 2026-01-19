<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	let expanded = $state(false);
</script>

<div
	role="none"
	class={expanded
		? ''
		: 'before:to-base-100 relative max-h-40 cursor-pointer overflow-hidden text-ellipsis before:absolute before:top-0 before:left-0 before:h-full before:w-full before:bg-gradient-to-b before:from-transparent'}
	onclick={() => (expanded = true)}
>
	<div class="prose">
		{@render children()}
	</div>
</div>
{#if expanded}
	<button class="btn btn-ghost btn-sm self-start" onclick={() => (expanded = false)}>
		Weniger anzeigen
	</button>
{/if}
