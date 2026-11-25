export interface MasonryItem {
	height: number;
	/** Takes every column, below all items before it */
	fullWidth?: boolean;
}

/** Where an item goes: its column, counted from 0, and the distance from the top */
export interface MasonryPlace {
	column: number;
	top: number;
}

/**
 * Places items of different heights in columns, each in the column that ends highest. A column
 * ending no more than `tolerance` below that one counts as ending there too, and among those the
 * next one in turn takes the item: slightly different heights then keep the reading order.
 */
export function masonryPlacement({
	items,
	columns,
	gap,
	tolerance = 0
}: {
	items: MasonryItem[];
	columns: number;
	gap: number;
	tolerance?: number;
}): MasonryPlace[] {
	let bottoms = Array.from({ length: columns }, () => 0);
	// The column whose turn it is, from left to right
	let next = 0;

	return items.map(({ height, fullWidth }) => {
		if (fullWidth) {
			const top = Math.max(...bottoms);
			bottoms = bottoms.map(() => top + height + gap);
			next = 0;
			return { column: 0, top };
		}
		const highest = Math.min(...bottoms);
		const order = bottoms.map((_, index) => (next + index) % columns);
		const column = order.find((index) => bottoms[index] <= highest + tolerance) ?? 0;
		const top = bottoms[column];
		bottoms[column] = top + height + gap;
		next = (column + 1) % columns;
		return { column, top };
	});
}
