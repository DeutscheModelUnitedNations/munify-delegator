<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { droppable, type DragDropState } from '@thisux/sveltednd';
	import type { Snippet } from 'svelte';

	/** The drop zone of everything without a role, on the delegations and the singles tab. */
	interface Props {
		container: string;
		count: number;
		hint?: string;
		/** Highlights the pool while something with a role is being dragged. */
		highlight?: boolean;
		class?: string;
		onDrop: (state: DragDropState<{ id: string }>) => void;
		children: Snippet;
	}

	let {
		container,
		count,
		hint,
		highlight = false,
		class: className = '',
		onDrop,
		children
	}: Props = $props();
</script>

<section
	class="bg-base-200 flex min-h-32 flex-col gap-2 rounded-lg p-3 {className} {highlight
		? 'ring-primary ring-2'
		: ''}"
	aria-label={m.assignmentPool()}
	use:droppable={{ container, callbacks: { onDrop } }}
>
	<h3 class="font-bold">
		{m.assignmentPool()}
		<span class="badge badge-sm">{count}</span>
	</h3>
	{#if hint}
		<p class="text-base-content/60 text-xs">{hint}</p>
	{/if}
	<div role="list" class="flex flex-wrap gap-2">
		{#if count > 0}
			{@render children()}
		{:else}
			<p class="text-base-content/60 py-6 text-center text-sm">{m.assignmentPoolEmpty()}</p>
		{/if}
	</div>
</section>
