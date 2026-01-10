<script lang="ts">
	import PuzzlePiece from './PuzzlePiece.svelte';

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
		compact?: boolean;
	}

	let { pieces, type, alpha2Code, fontAwesomeIcon, compact = false }: Props = $props();

	// Calculate optimal grid layout ensuring full coverage
	interface GridCell {
		piece: Piece;
		rowStart: number;
		rowEnd: number;
		colStart: number;
		colEnd: number;
	}

	let gridLayout = $derived.by(() => {
		const count = pieces.length;
		if (count === 0) return { rows: 1, cols: 1, cells: [] as GridCell[] };

		// Calculate optimal grid dimensions (wider than tall for flag aspect ratio)
		let cols: number;
		let rows: number;

		if (count === 1) {
			cols = 1;
			rows = 1;
		} else if (count === 2) {
			cols = 2;
			rows = 1;
		} else if (count === 3) {
			cols = 3;
			rows = 1;
		} else if (count === 4) {
			cols = 2;
			rows = 2;
		} else {
			// For larger counts, aim for ~1.5:1 aspect ratio (flag-like)
			cols = Math.ceil(Math.sqrt(count * 1.5));
			rows = Math.ceil(count / cols);
		}

		const totalCells = rows * cols;
		const extraCells = totalCells - count;

		// Create grid cells with spans for pieces that need to fill extra space
		const cells: GridCell[] = [];
		let pieceIndex = 0;
		let currentRow = 1;
		let currentCol = 1;

		// Distribute extra cells evenly among first `extraCells` pieces (they get colspan=2)
		const piecesWithSpan = new Set<number>();
		for (let i = 0; i < extraCells; i++) {
			// Spread the spanning pieces evenly
			const spanIndex = Math.floor((i * count) / Math.max(extraCells, 1));
			piecesWithSpan.add(spanIndex);
		}

		for (let i = 0; i < count; i++) {
			const piece = pieces[i];
			const hasSpan = piecesWithSpan.has(i);
			const colSpan = hasSpan ? 2 : 1;

			// Check if we need to wrap to next row
			if (currentCol + colSpan - 1 > cols) {
				currentRow++;
				currentCol = 1;
			}

			cells.push({
				piece,
				rowStart: currentRow,
				rowEnd: currentRow + 1,
				colStart: currentCol,
				colEnd: currentCol + colSpan
			});

			currentCol += colSpan;
		}

		return { rows, cols, cells };
	});

	let gridStyle = $derived(
		`grid-template-columns: repeat(${gridLayout.cols}, 1fr); grid-template-rows: repeat(${gridLayout.rows}, 1fr);`
	);

	// Clean icon name (remove 'fa-' prefix if present)
	let cleanIcon = $derived(fontAwesomeIcon?.replace('fa-', '') ?? 'building');
</script>

<div
	class="flag-reveal-container relative overflow-hidden rounded-lg shadow-inner {compact
		? 'aspect-video'
		: 'flag-aspect'}"
>
	<!-- Flag background layer -->
	<div class="absolute inset-0">
		{#if type === 'NATION' && alpha2Code}
			<span class="fi fi-{alpha2Code.toLowerCase()} flag-background"></span>
		{:else}
			<!-- NSA gradient background with icon -->
			<div
				class="w-full h-full bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center"
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
