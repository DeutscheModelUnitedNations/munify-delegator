/** A delegation's row of the matrix: its papers, by the column they were submitted for. */
export interface MatrixRow<D, P> {
	delegation: D;
	name: string;
	cells: Map<string, P[]>;
}

/**
 * Groups the columns' papers by delegation, one row each, sorted by the name `nameOf` gives
 * the delegation. A delegation without a paper in any column gets no row.
 */
export function matrixRows<D extends { id: string }, P extends { delegation: D }>(
	columns: readonly { id: string; papers: readonly P[] }[],
	nameOf: (paper: P) => string
): MatrixRow<D, P>[] {
	const byDelegation = new Map<string, MatrixRow<D, P>>();
	for (const column of columns) {
		for (const paper of column.papers) {
			const row = byDelegation.get(paper.delegation.id) ?? {
				delegation: paper.delegation,
				name: nameOf(paper),
				cells: new Map<string, P[]>()
			};
			byDelegation.set(paper.delegation.id, row);
			row.cells.set(column.id, [...(row.cells.get(column.id) ?? []), paper]);
		}
	}
	return [...byDelegation.values()].sort((a, b) => a.name.localeCompare(b.name));
}
