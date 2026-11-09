/** The row of a page that holds exactly one; `undefined` otherwise. */
export function soleRow<Row>(rows: readonly Row[]): Row | undefined {
	return rows.length === 1 ? rows[0] : undefined;
}
