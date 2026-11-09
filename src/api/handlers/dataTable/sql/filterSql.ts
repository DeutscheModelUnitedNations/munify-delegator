import { sql, type SQL } from 'drizzle-orm';
import { isFilterable, type ColumnMeta } from '#lib/dataGrid/columnTypes';
import type { Connective, FilterCondition, FilterRoot } from '#lib/dataGrid/stateSchema';
import { col } from '../source';
import { conditionSql } from './conditionSql';

/**
 * A whole filter tree as one SQL condition. Like in the browser, what does not count (incomplete,
 * or on a column the table does not have) is left out, and a group with nothing that counts
 * filters nothing.
 */

function join({ op, parts }: { op: Connective; parts: SQL[] }): SQL | undefined {
	if (parts.length === 0) return undefined;
	return sql`(${sql.join(parts, op === 'and' ? sql` and ` : sql` or `)})`;
}

export function filterSql({
	filter,
	columns,
	today
}: {
	filter: FilterRoot;
	columns: ReadonlyMap<string, ColumnMeta>;
	today: string;
}): SQL | undefined {
	const condition = (item: FilterCondition) => {
		const column = columns.get(item.column);
		if (!column || !isFilterable(column)) return [];
		return conditionSql({ column, condition: item, expr: col(column.id), today }) ?? [];
	};
	const parts = filter.items.flatMap((item) => {
		if (item.type === 'condition') return condition(item);
		return join({ op: item.op, parts: item.items.flatMap(condition) }) ?? [];
	});
	return join({ op: filter.op, parts });
}
