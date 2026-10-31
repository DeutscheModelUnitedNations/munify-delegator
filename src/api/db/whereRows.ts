import { relationsFilterToSQL, type AnyTableFilter, type SQL, type TableFilter } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

/**
 * A relational-API `where` on `table`'s own columns, as the SQL that `update`, `delete` and
 * `select` builders take. Throws on a filter that matches every row, so a mistaken `{}` (or an
 * `undefined` id) never turns into a write on the whole table.
 */
export function whereRows<T extends PgTable>(args: { table: T; filter: TableFilter<T> }): SQL;
export function whereRows({ table, filter }: { table: PgTable; filter: AnyTableFilter }): SQL {
	const where = relationsFilterToSQL(table, filter);
	if (!where) throw new Error('whereRows: the filter matches every row');
	return where;
}
