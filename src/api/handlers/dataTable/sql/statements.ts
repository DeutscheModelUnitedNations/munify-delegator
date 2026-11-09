import { sql, type SQL } from 'drizzle-orm';
import type { ColumnMeta } from '#lib/dataGrid/columnTypes';
import type { DataQuery } from '#lib/dataGrid/stateSchema';
import type { DataTableAccess, DataTableSource } from '../source';
import { filterSql } from './filterSql';
import { groupValueSql, pathSql, usableGrouping } from './groupSql';
import { orderSql } from './orderSql';

/**
 * The statements answering a table: one page of row ids, how many rows match, and the groups of a
 * level. All three read the source's rows under the alias `t`, narrowed by the filter, the search
 * and the group the query is in.
 */

export interface StatementInput {
	source: DataTableSource;
	conferenceId: string;
	access: DataTableAccess;
	query: DataQuery;
	search: string;
	/** Today as `YYYY-MM-DD`, for relative date conditions */
	today: string;
}

/** Every column id a query mentions, so a source can leave out what nobody asked for. */
function usedColumns(query: DataQuery, source: DataTableSource) {
	const conditions = query.filter.items.flatMap((item) =>
		item.type === 'condition' ? [item.column] : item.items.map((inner) => inner.column)
	);
	return new Set([
		...conditions,
		...query.sorting.map((entry) => entry.id),
		...query.grouping.map((entry) => entry.column),
		...source.tieBreak.map((entry) => entry.id)
	]);
}

/** The `from … where …` the statements share, and the grouping levels that apply. */
function matching(input: StatementInput) {
	const { source, query, search, today } = input;
	const columns = new Map<string, ColumnMeta>(source.columns.map((column) => [column.id, column]));
	const levels = usableGrouping({ grouping: query.grouping, columns });
	const term = search.trim();
	const filter = filterSql({ filter: query.filter, columns, today });
	const conditions = [
		...(filter ? [filter] : []),
		...(term ? [source.search(term)] : []),
		...pathSql({ path: query.path.slice(0, levels.length), levels })
	];
	const rows = source.rows({
		conferenceId: input.conferenceId,
		access: input.access,
		uses: usedColumns(query, source)
	});
	const from = sql`from (${rows}) as t ${
		conditions.length > 0 ? sql`where ${sql.join(conditions, sql` and `)}` : sql``
	}`;
	return { from, columns, levels };
}

/** The ids of one page, one more than `limit` (whether another page follows). */
export function pageStatement({
	input,
	limit,
	offset
}: {
	input: StatementInput;
	limit: number;
	offset: number;
}): SQL {
	const { from, columns } = matching(input);
	const order = orderSql({
		sorting: input.query.sorting,
		tieBreak: [...input.source.tieBreak],
		columns
	});
	return sql`select t.id ${from} order by ${order} limit ${limit + 1} offset ${offset}`;
}

/** How many rows match, across all pages. */
export function countStatement(input: StatementInput): SQL {
	return sql`select count(*)::int as total ${matching(input).from}`;
}

/** The most groups one level lists. */
const MAX_GROUPS = 1000;

/**
 * The groups of the level below `query.path`, each with how many rows it holds; `undefined` when
 * there is no such level.
 */
export function groupsStatement(input: StatementInput): SQL | undefined {
	const { from, levels } = matching(input);
	const level = levels[input.query.path.length];
	if (!level) return undefined;
	return sql`select ${groupValueSql(level)} as value, count(*)::int as count ${from}
		group by 1 order by 1 nulls last limit ${MAX_GROUPS}`;
}
