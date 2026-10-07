<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		state: 'LOCKED' | 'UNLOCKED' | 'FOUND';
		title?: string | null;
		compact?: boolean;
		overlay?: boolean;
	}

	let { state, title, compact = false, overlay = false }: Props = $props();

	/**
	 * Per state: the tile classes (`bg`), the overlay classes for the flag reveal effect
	 * (`overlay`), the icon color on a tile and on an overlay, and the default tooltip.
	 */
	const stateStyles: Record<
		Props['state'],
		{ bg: string; overlay: string; icon: string; overlayIcon: string; tooltip: () => string }
	> = {
		LOCKED: {
			bg: 'bg-base-300',
			overlay: 'piece-locked',
			icon: 'text-base-content/30',
			overlayIcon: 'text-white/30',
			tooltip: m.pieceLockedTooltip
		},
		UNLOCKED: {
			bg: 'bg-base-200 border-2 border-dashed border-primary/50',
			overlay: 'piece-unlocked',
			icon: 'text-primary/50',
			overlayIcon: 'text-white/70',
			tooltip: m.pieceUnlockedTooltip
		},
		FOUND: {
			bg: 'bg-primary/20 border border-primary/30',
			overlay: 'piece-found',
			icon: 'text-success',
			overlayIcon: 'text-success drop-shadow-md',
			tooltip: m.pieceFoundTooltip
		}
	};

	let stateStyle = $derived(stateStyles[state]);
	// Original tile-based styling (for backwards compatibility)
	let bgClass = $derived(overlay ? '' : stateStyle.bg);
	// Overlay-based styling (for flag reveal effect)
	let overlayClass = $derived(overlay ? stateStyle.overlay : '');
	// Use title prop if provided (e.g., agenda item title), otherwise use state-based tooltip
	let tooltipText = $derived(title || stateStyle.tooltip());
	let iconClass = $derived(overlay ? stateStyle.overlayIcon : stateStyle.icon);
</script>

<div
	class="h-full w-full flex items-center justify-center transition-all duration-500 {bgClass} {overlayClass}"
	class:rounded-selector={!overlay}
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
