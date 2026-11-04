import type { GroupPath } from '#lib/dataGrid/stateSchema';
import type { GridSource } from './dataSource';
import type { GridState } from './gridState.svelte';

/**
 * What a page of rows is asked with: the grid's applied query for the group `path` (the whole
 * table where it is empty; not grouped when `flat`), its search and page size.
 */
export function pageRequest<Row>({
	grid,
	path = [],
	pageIndex,
	flat = false
}: {
	grid: GridState<Row>;
	path?: GroupPath;
	pageIndex: number;
	flat?: boolean;
}): Parameters<GridSource<Row>['page']>[0] {
	const query = grid.query(path);
	return {
		query: flat ? { ...query, grouping: [] } : query,
		search: grid.search,
		pageIndex,
		pageSize: grid.state.pageSize
	};
}
