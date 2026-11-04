import type { Snippet } from 'svelte';
import type { GridLayout } from './table/layout';

/** What every part rendering rows needs, handed down from `DataGrid` unchanged. */
export interface RowProps<Row> {
	layout: GridLayout<Row>;
	/** All the table's columns, selection and actions included, for cells spanning a row */
	colspan: number;
	selectable: boolean;
	onRowClick?: (row: Row) => void;
	isRowHighlighted?: (row: Row) => boolean;
	actions?: Snippet<[Row]>;
	actionsWidth: number;
}
