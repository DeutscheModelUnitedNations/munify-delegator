<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	let expanded = $state(false);

	$inspect(expanded);
</script>

<div class={expanded ? '' : 'row'} onclick={() => (expanded = true)}>
	<div class="prose">
		{@render children()}
	</div>
</div>
{#if expanded}
	<button class="btn btn-ghost btn-sm self-start" onclick={() => (expanded = false)}>
		Weniger anzeigen
	</button>
{/if}

<style>
	.row {
		max-height: 8rem;
		overflow: hidden;
		text-overflow: ellipsis;
		content: '';
		position: relative;
		cursor: pointer;
	}
	.row::before {
		content: '';
		width: 100%;
		height: 100%;
		position: absolute;
		left: 0;
		top: 0;
		background: linear-gradient(transparent 2rem, white);
	}
</style>
