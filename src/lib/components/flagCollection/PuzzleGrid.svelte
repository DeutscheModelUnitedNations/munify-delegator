<script lang="ts">
	import PuzzlePiece from './PuzzlePiece.svelte';

	interface Piece {
		id: string;
		agendaItemTitle: string | null;
		state: 'LOCKED' | 'UNLOCKED' | 'FOUND';
	}

	interface Props {
		pieces: Piece[];
		compact?: boolean;
	}

	let { pieces, compact = false }: Props = $props();

	// Calculate grid dimensions for a visually pleasing layout
	// For small counts, prefer wider layouts
	let gridCols = $derived.by(() => {
		const count = pieces.length;
		if (count <= 2) return count;
		if (count <= 4) return 2;
		if (count <= 6) return 3;
		if (count <= 9) return 3;
		return Math.ceil(Math.sqrt(count));
	});
</script>

<div class="grid gap-0.5" style="grid-template-columns: repeat({gridCols}, 1fr);">
	{#each pieces as piece (piece.id)}
		<PuzzlePiece state={piece.state} title={piece.agendaItemTitle} {compact} />
	{/each}
</div>
