<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		state: 'LOCKED' | 'UNLOCKED' | 'FOUND';
		title?: string | null;
		compact?: boolean;
		overlay?: boolean;
	}

	let { state, title, compact = false, overlay = false }: Props = $props();

	// Original tile-based styling (for backwards compatibility)
	let bgClass = $derived.by(() => {
		if (overlay) return '';
		switch (state) {
			case 'LOCKED':
				return 'bg-base-300';
			case 'UNLOCKED':
				return 'bg-base-200 border-2 border-dashed border-primary/50';
			case 'FOUND':
				return 'bg-primary/20 border border-primary/30';
		}
	});

	// Overlay-based styling (for flag reveal effect)
	let overlayClass = $derived.by(() => {
		if (!overlay) return '';
		switch (state) {
			case 'LOCKED':
				return 'piece-locked';
			case 'UNLOCKED':
				return 'piece-unlocked';
			case 'FOUND':
				return 'piece-found';
		}
	});

	let tooltipText = $derived.by(() => {
		// Use title prop if provided (e.g., agenda item title), otherwise use state-based tooltip
		if (title) return title;
		switch (state) {
			case 'LOCKED':
				return m.pieceLockedTooltip();
			case 'UNLOCKED':
				return m.pieceUnlockedTooltip();
			case 'FOUND':
				return m.pieceFoundTooltip();
		}
	});

	let iconClass = $derived.by(() => {
		if (overlay) {
			switch (state) {
				case 'LOCKED':
					return 'text-white/30';
				case 'UNLOCKED':
					return 'text-white/70';
				case 'FOUND':
					return 'text-success drop-shadow-md';
			}
		}
		switch (state) {
			case 'LOCKED':
				return 'text-base-content/30';
			case 'UNLOCKED':
				return 'text-primary/50';
			case 'FOUND':
				return 'text-success';
		}
	});
</script>

<div
	class="h-full w-full flex items-center justify-center transition-all duration-500 {bgClass} {overlayClass}"
	class:rounded-sm={!overlay}
	class:aspect-square={!overlay}
	class:hover:scale-105={!compact && !overlay}
	title={tooltipText}
>
	{#if state === 'LOCKED'}
		<i class="fa-solid fa-lock {iconClass} {compact ? 'text-xs' : 'text-sm'}"></i>
	{:else if state === 'UNLOCKED'}
		<i class="fa-solid fa-puzzle-piece {iconClass} {compact ? 'text-xs' : 'text-sm'}"></i>
	{:else if !overlay}
		<!-- Only show check icon in non-overlay mode (old tile view) -->
		<i class="fa-solid fa-check {iconClass} {compact ? 'text-xs' : 'text-sm'}"></i>
	{/if}
</div>

<style>
	/* Overlay mode styles for flag reveal effect */
	.piece-locked {
		background-color: rgba(0, 0, 0, 0.95);
	}

	.piece-unlocked {
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		background-color: rgba(0, 0, 0, 0.55);
	}

	.piece-found {
		backdrop-filter: blur(0);
		-webkit-backdrop-filter: blur(0);
		background-color: transparent;
	}
</style>
