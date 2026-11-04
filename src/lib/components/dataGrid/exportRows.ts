import { exportText, type GridColumn } from './gridColumn';

/** What a table export holds: one heading per column, one text cell per column and row. */
export interface TableExport {
	header: string[];
	data: string[][];
}

/** The shown columns' text for the rows given, as the screen reads it. */
export function tableExport<Row>({
	columns,
	rows
}: {
	columns: readonly GridColumn<Row>[];
	rows: readonly Row[];
}): TableExport {
	return {
		header: columns.map((column) => column.label),
		data: rows.map((row) => columns.map((column) => exportText({ column, row })))
	};
}
