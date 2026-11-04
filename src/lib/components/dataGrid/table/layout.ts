import type { GridColumn } from '../gridColumn';

/** The width of the selection column. */
export const SELECT_WIDTH = 44;

/** A column's width: what the view says, else the column's own, else a default. */
function columnWidth<Row>({
	column,
	sizes
}: {
	column: GridColumn<Row>;
	sizes: Readonly<Record<string, number>>;
}) {
	return sizes[column.id] ?? column.size ?? 160;
}

/**
 * Where the shown columns go: each one's width, the left offset of the pinned ones (they stay put
 * while the table scrolls sideways, after the selection column), and the table's whole width.
 */
export function gridLayout<Row>({
	columns,
	sizes,
	selectable,
	actionsWidth
}: {
	columns: readonly GridColumn<Row>[];
	sizes: Readonly<Record<string, number>>;
	selectable: boolean;
	actionsWidth: number;
}) {
	let left = selectable ? SELECT_WIDTH : 0;
	const cells = columns.map((column) => {
		const width = columnWidth({ column, sizes });
		const pinnedLeft = column.alwaysVisible ? left : undefined;
		if (column.alwaysVisible) left += width;
		return { column, width, left: pinnedLeft };
	});
	const total =
		cells.reduce((sum, cell) => sum + cell.width, 0) +
		(selectable ? SELECT_WIDTH : 0) +
		actionsWidth;
	return { cells, total };
}

export type GridLayout<Row> = ReturnType<typeof gridLayout<Row>>;
