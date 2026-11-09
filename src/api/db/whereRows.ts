import { relationsFilterToSQL, SQL, type AnyTableFilter, type TableFilter } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

/**
 * A relational-API `where` on `table`'s own columns, as the SQL that `update`, `delete` and
 * `select` builders take. Throws on a filter that matches every row, so a mistaken `{}` (or an
 * `undefined` id) never turns into a write on the whole table. drizzle collects the condition's
 * chunks (`sql`, undefined for no condition); they make one SQL, parentheses included.
 */
export function whereRows<T extends PgTable>(args: { table: T; filter: TableFilter<T> }): SQL;
export function whereRows({ table, filter }: { table: PgTable; filter: AnyTableFilter }): SQL {
	const { sql: chunks } = relationsFilterToSQL(table, filter);
	if (!chunks) throw new Error('whereRows: the filter matches every row');
	return new SQL(chunks);
}
