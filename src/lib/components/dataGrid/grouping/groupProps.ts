import type { GroupPath } from '#lib/dataGrid/stateSchema';
import type { GridSource } from '../dataSource';
import type { GridState } from '../gridState.svelte';
import type { RowProps } from '../rowProps';

/** What every part of a grouped table gets: the grid, the source, the group it is about. */
export interface GroupProps<Row> extends RowProps<Row> {
	grid: GridState<Row>;
	source: GridSource<Row>;
	path: GroupPath;
}
