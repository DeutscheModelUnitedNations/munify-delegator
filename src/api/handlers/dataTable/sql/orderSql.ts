import { sql, type SQL } from 'drizzle-orm';
import { isSortable, type ColumnMeta } from '#lib/dataGrid/columnTypes';
import type { Sorting } from '#lib/dataGrid/stateSchema';
import { col } from '../source';

/**
 * The `order by` of a page: the sorting, then the source's tie-breakers, then the id, so paging
 * through equal rows stays stable. Empty values come last in either direction, enums sort by their
 * options' order and text without regard to case, as in the browser.
 */
function sortExpr(column: ColumnMeta): SQL {
	const expr = col(column.id);
	switch (column.type) {
		case 'enum':
			return sql`array_position(${sql.param([...(column.options ?? [])])}::text[], ${expr})`;
		case 'text':
			return sql`lower(nullif(btrim(${expr}), ''))`;
		case 'multiEnum':
			return sql`nullif(array_to_string(${expr}, ', '), '')`;
		default:
			return expr;
	}
}

export function orderSql({
	sorting,
	tieBreak,
	columns
}: {
	sorting: Sorting;
	tieBreak: Sorting;
	columns: ReadonlyMap<string, ColumnMeta>;
}): SQL {
	const terms = [...sorting, ...tieBreak].flatMap(({ id, desc }) => {
		const column = columns.get(id);
		if (!column || !isSortable(column)) return [];
		// an enum value outside its options sorts after them, by its text
		const extra =
			column.type === 'enum'
				? [sql`${col(column.id)} ${desc ? sql`desc` : sql`asc`} nulls last`]
				: [];
		return [sql`${sortExpr(column)} ${desc ? sql`desc` : sql`asc`} nulls last`, ...extra];
	});
	return sql.join([...terms, sql`t.id asc`], sql`, `);
}
