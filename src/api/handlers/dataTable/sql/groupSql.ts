import { sql, type SQL } from 'drizzle-orm';
import { isGroupable, type ColumnMeta } from '#lib/dataGrid/columnTypes';
import { dateBucketOf } from '#lib/dataGrid/grouping';
import type { DateBucket, GroupBy, GroupPath } from '#lib/dataGrid/stateSchema';
import { col } from '../source';

/**
 * Groups in SQL: the text naming the group a row falls into - the very text
 * `#lib/dataGrid/grouping`'s `groupValueOf` makes in the browser - and the conditions that keep
 * the rows of one group.
 */

const DATE_FORMAT: Record<DateBucket, string> = {
	day: 'YYYY-MM-DD',
	month: 'YYYY-MM',
	year: 'YYYY'
};

/** The group a row falls into for `groupBy`, as text; `null` for rows without a value. */
export function groupValueSql({ column, groupBy }: { column: ColumnMeta; groupBy: GroupBy }): SQL {
	const expr = col(column.id);
	switch (column.type) {
		case 'boolean':
			return sql`(case when ${expr} is null then null when ${expr} then 'true' else 'false' end)`;
		case 'number':
			return groupBy.step
				? sql`((floor(${expr}::float8 / ${groupBy.step}) * ${groupBy.step})::float8)::text`
				: sql`(${expr}::float8)::text`;
		case 'date':
			return sql`to_char(${expr}, ${DATE_FORMAT[dateBucketOf(groupBy)]})`;
		default:
			return sql`nullif(${expr}::text, '')`;
	}
}

/** The grouping levels that apply: those on columns the table has and can group by. */
export function usableGrouping({
	grouping,
	columns
}: {
	grouping: readonly GroupBy[];
	columns: ReadonlyMap<string, ColumnMeta>;
}) {
	return grouping.flatMap((groupBy) => {
		const column = columns.get(groupBy.column);
		return column && isGroupable(column) ? [{ groupBy, column }] : [];
	});
}

/** The conditions keeping the rows of the group `path` names, one per level. */
export function pathSql({
	path,
	levels
}: {
	path: GroupPath;
	levels: ReturnType<typeof usableGrouping>;
}): SQL[] {
	return path.map((value, index) => {
		const expr = groupValueSql(levels[index]);
		return value === null ? sql`${expr} is null` : sql`${expr} = ${value}`;
	});
}
