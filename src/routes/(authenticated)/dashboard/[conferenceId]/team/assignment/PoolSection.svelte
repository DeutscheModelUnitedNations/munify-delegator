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
		/**
		 * The children are a virtualized list that scrolls on its own, so the section skips its
		 * wrapping list and its empty hint is the only thing it adds.
		 */
		virtual?: boolean;
		/** Only some pages of the pool are loaded: `count` is what they hold, and more may follow. */
		more?: boolean;
		onDrop: (state: DragDropState<{ id: string }>) => void;
		children: Snippet;
	}

	let {
		container,
		count,
		hint,
		highlight = false,
		class: className = '',
		virtual = false,
		more = false,
		onDrop,
		children
	}: Props = $props();
</script>

<section
	class="bg-base-200 flex min-h-32 flex-col gap-2 rounded-box p-3 {className} {highlight
		? 'ring-primary ring-2'
		: ''}"
	aria-label={m.assignmentPool()}
	use:droppable={{ container, callbacks: { onDrop } }}
>
	<h3 class="font-bold">
		{m.assignmentPool()}
		<span class="badge badge-sm">{count}{more ? '+' : ''}</span>
	</h3>
	{#if hint}
		<p class="text-base-content/60 text-xs">{hint}</p>
	{/if}
	{#if count === 0 && !more}
		<p class="text-base-content/60 py-6 text-center text-sm">{m.assignmentPoolEmpty()}</p>
	{:else if virtual}
		<!-- Fills the rest of the section; the virtual list scrolls inside it. -->
		<div role="list" class="flex min-h-0 flex-1 flex-col">
			{@render children()}
		</div>
	{:else}
		<div role="list" class="flex flex-wrap gap-2">
			{@render children()}
		</div>
	{/if}
</section>
