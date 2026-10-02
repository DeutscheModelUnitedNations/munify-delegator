interface GridCell<P> {
	piece: P;
	rowStart: number;
	rowEnd: number;
	colStart: number;
	colEnd: number;
}

/** Hand-picked grids for few pieces; wider than tall, like a flag. */
const smallGrids: Record<number, { cols: number; rows: number }> = {
	1: { cols: 1, rows: 1 },
	2: { cols: 2, rows: 1 },
	3: { cols: 3, rows: 1 },
	4: { cols: 2, rows: 2 }
};

/** Grid dimensions for `count` pieces; larger counts aim for a ~1.5:1 (flag-like) aspect ratio. */
export function gridDimensions(count: number) {
	const small = smallGrids[count];
	if (small) return small;
	const cols = Math.ceil(Math.sqrt(count * 1.5));
	return { cols, rows: Math.ceil(count / cols) };
}

/**
 * Lays the pieces out on a grid that is fully covered: the cells left over are handed out as
 * double-width spans to pieces spread evenly across the list.
 */
export function computeGridLayout<P>(pieces: readonly P[]) {
	const count = pieces.length;
	if (count === 0) return { rows: 1, cols: 1, cells: [] as GridCell<P>[] };

	const { cols, rows } = gridDimensions(count);
	const extraCells = rows * cols - count;

	// Distribute extra cells evenly among `extraCells` pieces (they get colspan=2)
	const piecesWithSpan = new Set<number>();
	for (let i = 0; i < extraCells; i++) {
		piecesWithSpan.add(Math.floor((i * count) / extraCells));
	}

	const cells: GridCell<P>[] = [];
	let currentRow = 1;
	let currentCol = 1;

	pieces.forEach((piece, i) => {
		const colSpan = piecesWithSpan.has(i) ? 2 : 1;

		// Wrap to the next row when the piece would not fit
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
	});

	return { rows, cols, cells };
}

/** Flags with the most pieces found first, then alphabetically by name. */
export function compareFlagsByProgress(
	a: { foundPieces: number; name: string },
	b: { foundPieces: number; name: string }
) {
	if (b.foundPieces !== a.foundPieces) return b.foundPieces - a.foundPieces;
	return a.name.localeCompare(b.name);
}

/** The flags `keep` accepts, sorted by progress; no flags at all yields an empty list. */
export function filterAndSortFlags<F extends { foundPieces: number; name: string }>(
	flags: readonly F[] | undefined,
	keep: (flag: F) => boolean = () => true
) {
	return (flags ?? []).filter(keep).sort(compareFlagsByProgress);
}
