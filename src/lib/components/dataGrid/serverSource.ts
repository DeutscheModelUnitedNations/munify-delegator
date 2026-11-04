import { client } from '#lib/api/rumbleClient/client';
import type { DataTableKey } from '#lib/dataGrid/tableKeys';
import type { GridSource } from './dataSource';

/** The most rows one request to the table engine answers. */
const BACKEND_PAGE_LIMIT = 1000;

/** What a page of the engine answered: the row ids in order and, where a table exposes them, values. */
export interface EnginePage {
	ids: string[];
	values: unknown[] | null;
}

/**
 * A source asking the API's table engine (`dataTablePage`, `dataTableGroups`), which searches,
 * filters, sorts and groups the table in the database and answers row ids. `rowsFor` fetches the
 * rows of those ids through the page's own (live) queries and answers a reader building them, in
 * that order, from the results: the grid calls it inside a `$derived`, where reading the live
 * results is tracked.
 */
export function createServerSource<Row>({
	table,
	conferenceId,
	rowsFor,
	changes
}: {
	table: DataTableKey;
	conferenceId: string;
	rowsFor: (page: EnginePage) => Promise<() => Row[]>;
	/**
	 * A live query of the table's rows, read as a text that changes when one is added or removed
	 * (`GridSource.changes`): the engine's answers are not live, so without it the grid never hears
	 * of a new row.
	 */
	changes?: () => Promise<() => string>;
}): GridSource<Row> {
	const fetchPage = async ({
		query,
		search,
		revision,
		limit,
		offset
	}: {
		query: Parameters<GridSource<Row>['page']>[0]['query'];
		search: string;
		revision?: string;
		limit: number;
		offset: number;
	}) => {
		const page = await client.query.dataTablePage({
			// `revision` keeps the client's cache from answering a request after a change with the
			// ids it had before
			__args: {
				table,
				conferenceId,
				query,
				search: search || undefined,
				revision: revision || undefined,
				limit,
				offset
			},
			ids: true,
			hasMore: true,
			total: true,
			values: true
		});
		return {
			ids: [...page.ids],
			values: page.values ? [...page.values] : null,
			hasMore: page.hasMore,
			total: Number(page.total)
		};
	};

	return {
		changes,
		async page({ query, search, revision, pageIndex, pageSize }) {
			const page = await fetchPage({
				query,
				search,
				revision,
				limit: pageSize,
				offset: pageIndex * pageSize
			});
			const rows = await rowsFor(page);
			return () => ({ rows: rows(), total: page.total });
		},
		async groups({ query, search, revision }) {
			const groups = await client.query.dataTableGroups({
				__args: {
					table,
					conferenceId,
					query,
					search: search || undefined,
					revision: revision || undefined
				},
				value: true,
				count: true
			});
			const counted = groups.map((group) => ({
				value: group.value ?? null,
				count: Number(group.count)
			}));
			return () => counted;
		},
		async all({ query, search, revision }) {
			const rows: Row[] = [];
			for (let offset = 0; ; offset += BACKEND_PAGE_LIMIT) {
				const page = await fetchPage({
					query,
					search,
					revision,
					limit: BACKEND_PAGE_LIMIT,
					offset
				});
				rows.push(...(await rowsFor(page))());
				if (!page.hasMore) return rows;
			}
		}
	};
}
