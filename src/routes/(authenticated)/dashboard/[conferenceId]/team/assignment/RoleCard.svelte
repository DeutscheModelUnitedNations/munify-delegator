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
		/**
		 * Height of the list while seats are free. Once the role is full the free-seat box is gone and
		 * the list grows by its height, so the card keeps its size without an empty gap.
		 */
		listHeight?: string;
		onDrop: (state: DragDropState<{ id: string }>) => void;
		children?: Snippet<[listHeight: string]>;
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
		listHeight = '20rem',
		onDrop,
		children
	}: Props = $props();

	const free = $derived(seats - taken);
	// The free-seat box: two lines of padding and border (2.25rem) plus the gap above it.
	const height = $derived(free > 0 ? listHeight : `calc(${listHeight} + 2.75rem)`);
</script>

<div
	role="list"
	aria-label={title}
	use:droppable={{ container, callbacks: { onDrop } }}
	class="flex w-full flex-col gap-2 rounded-box border p-2 transition-colors
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
	{@render children?.(height)}
	{#if free > 0}
		<div
			class="border-base-content/30 text-base-content/50 rounded-field border-2 border-dashed py-2 text-center text-xs"
		>
			{m.assignmentFreeSeats({ count: free })}
		</div>
	{/if}
</div>
