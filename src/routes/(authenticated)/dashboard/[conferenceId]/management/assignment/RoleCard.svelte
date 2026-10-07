<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import { m } from '$lib/paraglide/messages';
	import { droppable, type DragDropState } from '@thisux/sveltednd';
	import type { Snippet } from 'svelte';

	/**
	 * A nation, non-state actor or custom role on the board: its seats, who holds them, and a drop
	 * zone for the groups dragged onto it.
	 */
	interface Props {
		container: string;
		title: string;
		subtitle?: string;
		alpha2Code?: string;
		icon?: string;
		seats: number;
		taken: number;
		/** Highlights the role while something that fits is being dragged. */
		highlight?: boolean;
		onDrop: (state: DragDropState<{ id: string }>) => void;
		children?: Snippet;
	}

	let {
		container,
		title,
		subtitle,
		alpha2Code,
		icon,
		seats,
		taken,
		highlight = false,
		onDrop,
		children
	}: Props = $props();

	const free = $derived(seats - taken);
</script>

<div
	role="list"
	aria-label={title}
	use:droppable={{ container, callbacks: { onDrop } }}
	class="flex w-52 flex-col gap-2 rounded-lg border p-2 transition-colors
		{free < 0
		? 'border-error bg-error/10'
		: free === 0
			? 'border-success bg-success/5'
			: highlight
				? 'border-primary bg-primary/10'
				: 'border-base-300 bg-base-200'}"
>
	<div class="flex items-center gap-2">
		<Flag {alpha2Code} nsa={!alpha2Code} {icon} size="xs" />
		<div class="flex min-w-0 flex-col">
			<span class="truncate text-sm font-bold" {title}>{title}</span>
			{#if subtitle}
				<span class="text-base-content/60 truncate text-xs" title={subtitle}>{subtitle}</span>
			{/if}
		</div>
	</div>
	<div class="flex items-center justify-between text-xs">
		<span>{m.assignmentSeatsTaken({ taken, seats })}</span>
		{#if free < 0}
			<span class="badge badge-xs badge-error">{m.assignmentOverCapacity()}</span>
		{/if}
	</div>
	{@render children?.()}
	{#if free > 0}
		<div
			class="border-base-content/30 text-base-content/50 rounded-md border-2 border-dashed py-2 text-center text-xs"
		>
			{m.assignmentFreeSeats({ count: free })}
		</div>
	{/if}
</div>
