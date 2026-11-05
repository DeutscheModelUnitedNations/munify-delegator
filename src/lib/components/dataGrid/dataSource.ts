import { todayKey } from '#lib/dataGrid/dateConditions';
import type { GroupCount } from '#lib/dataGrid/grouping';
import { queryGroups, queryRows } from '#lib/dataGrid/localEngine';
import type { DataQuery } from '#lib/dataGrid/stateSchema';
import { localColumns, type GridColumn } from './gridColumn';

/**
 * Where a grid's rows come from. The grid asks for one page of a group (the whole table when not
 * grouped), for the groups of a level, and for every matching row (the export); how the answer is
 * found is the source's business. `createServerSource` asks the API's table engine, a page reading
 * its rows through its own queries; `createLocalSource` works through rows the page already holds.
 *
 * A request answers a reader rather than the rows: the component awaits the request in one
 * `$derived(await …)` and calls the reader in another. Live query results are only tracked where
 * they are read synchronously inside a derived - a read after an `await` is not - so the reader is
 * what makes the grid follow their updates (a new row, a changed status).
 */
export interface GridPage<Row> {
	rows: Row[];
	/** Every row matching within the group, across all pages */
	total: number;
}

export interface GridRequest {
	query: DataQuery;
	search: string;
	/**
	 * What the source's `changes` last said. Sources ignore it; it is part of the request so the
	 * grid asks again when it changes.
	 */
	revision?: string;
}

export interface GridSource<Row> {
	page(
		request: GridRequest & { pageIndex: number; pageSize: number }
	): Promise<() => GridPage<Row>>;
	groups(request: GridRequest): Promise<() => GroupCount[]>;
	/** Every matching row, once (the export) */
	all(request: GridRequest): Promise<Row[]>;
	/**
	 * A live signal of the rows there are, for a source whose answers are not live themselves (the
	 * table engine's): a reader of a text that changes whenever a row is added or removed. The grid
	 * asks for its pages and groups again then.
	 */
	changes?(): Promise<() => string>;
}

/**
 * A source over rows the page holds. `rows` and `columns` are read on every request, so both may
 * be reactive (a table whose columns follow its data, like the seats per committee).
 */
export function createLocalSource<Row>({
	rows,
	columns,
	tieBreaker
}: {
	rows: () => readonly Row[];
	columns: () => readonly GridColumn<Row>[];
	tieBreaker?: (a: Row, b: Row) => number;
}): GridSource<Row> {
	const run = ({ query, search }: GridRequest) =>
		queryRows({
			rows: rows(),
			columns: localColumns(columns()),
			query,
			search,
			today: todayKey(),
			tieBreaker
		});
	return {
		async page(request) {
			return () => {
				const matching = run(request);
				const start = request.pageIndex * request.pageSize;
				return { rows: matching.slice(start, start + request.pageSize), total: matching.length };
			};
		},
		async groups(request) {
			return () =>
				queryGroups({
					rows: rows(),
					columns: localColumns(columns()),
					query: request.query,
					search: request.search,
					today: todayKey(),
					tieBreaker
				});
		},
		async all(request) {
			return run(request);
		}
	};
}
