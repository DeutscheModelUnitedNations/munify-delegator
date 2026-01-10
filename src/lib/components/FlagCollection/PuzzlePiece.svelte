<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		state: 'LOCKED' | 'UNLOCKED' | 'FOUND';
		title?: string | null;
		compact?: boolean;
	}

	let { state, title, compact = false }: Props = $props();

	let bgClass = $derived(() => {
		switch (state) {
			case 'LOCKED':
				return 'bg-base-300';
			case 'UNLOCKED':
				return 'bg-base-200 border-2 border-dashed border-primary/50';
			case 'FOUND':
				return 'bg-primary/20 border border-primary/30';
		}
	});

	let tooltipText = $derived(() => {
		switch (state) {
			case 'LOCKED':
				return m.pieceLockedTooltip();
			case 'UNLOCKED':
				return m.pieceUnlockedTooltip();
			case 'FOUND':
				return m.pieceFoundTooltip();
		}
	});
</script>

<div
	class="aspect-square rounded-sm {bgClass()} flex items-center justify-center transition-all tooltip tooltip-top"
	class:hover:scale-105={!compact}
	data-tip={title ?? tooltipText()}
>
	{#if state === 'LOCKED'}
		<i class="fa-solid fa-lock text-base-content/30 {compact ? 'text-xs' : 'text-sm'}"></i>
	{:else if state === 'UNLOCKED'}
		<i class="fa-solid fa-puzzle-piece text-primary/50 {compact ? 'text-xs' : 'text-sm'}"></i>
	{:else}
		<i class="fa-solid fa-check text-success {compact ? 'text-xs' : 'text-sm'}"></i>
	{/if}
</div>
