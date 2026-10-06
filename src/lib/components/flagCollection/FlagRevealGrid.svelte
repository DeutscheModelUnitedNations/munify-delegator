<script lang="ts">
	import PuzzlePiece from './PuzzlePiece.svelte';
	import { getNsaGradients } from '$lib/helpers/nsaGradient';
	import { computeGridLayout } from './flagCollectionLayout';

	interface Piece {
		id: string;
		agendaItemTitle: string | null;
		state: 'LOCKED' | 'UNLOCKED' | 'FOUND';
	}

	interface Props {
		pieces: Piece[];
		type: 'NATION' | 'NSA';
		alpha2Code?: string | null;
		fontAwesomeIcon?: string | null;
		nsaId?: string | null;
		compact?: boolean;
	}

	let { pieces, type, alpha2Code, fontAwesomeIcon, nsaId, compact = false }: Props = $props();

	// Generate deterministic gradients for NSAs based on their ID
	let nsaGradients = $derived(nsaId ? getNsaGradients(nsaId) : null);

	// Calculate optimal grid layout ensuring full coverage
	let gridLayout = $derived(computeGridLayout(pieces));

	let gridStyle = $derived(
		`grid-template-columns: repeat(${gridLayout.cols}, 1fr); grid-template-rows: repeat(${gridLayout.rows}, 1fr);`
	);

	// Clean icon name (remove 'fa-' prefix if present)
	let cleanIcon = $derived(fontAwesomeIcon?.replace('fa-', '') ?? 'building');
</script>

<div
	class="flag-reveal-container relative overflow-hidden rounded-box shadow-inner {compact
		? 'aspect-video'
		: 'flag-aspect'}"
>
	<!-- Flag background layer -->
	<div class="absolute inset-0">
		{#if type === 'NATION' && alpha2Code}
			<span class="fi fi-{alpha2Code.toLowerCase()} flag-background"></span>
		{:else}
			<!-- NSA gradient background with icon - uses deterministic colors from NSA ID -->
			<div
				class="w-full h-full flex items-center justify-center"
				style="background: linear-gradient(to bottom right, {nsaGradients?.gradient1.from ??
					'hsl(220, 70%, 45%)'}, {nsaGradients?.gradient1.to ?? 'hsl(260, 70%, 55%)'})"
			>
				<i
					class="fa-solid fa-{cleanIcon} text-white/30"
					class:text-4xl={!compact}
					class:text-2xl={compact}
				></i>
			</div>
		{/if}
	</div>

	<!-- Piece overlay grid -->
	<div class="absolute inset-0 grid" style={gridStyle}>
		{#each gridLayout.cells as cell (cell.piece.id)}
			<div
				style="grid-row: {cell.rowStart} / {cell.rowEnd}; grid-column: {cell.colStart} / {cell.colEnd};"
			>
				<PuzzlePiece
					state={cell.piece.state}
					title={cell.piece.agendaItemTitle}
					{compact}
					overlay
				/>
			</div>
		{/each}
	</div>
</div>

<style>
	.flag-aspect {
		aspect-ratio: 3 / 2;
	}

	.flag-background {
		display: block;
		width: 100% !important;
		height: 100% !important;
		background-size: cover !important;
		background-position: center !important;
		line-height: 1000rem !important;
	}
</style>
