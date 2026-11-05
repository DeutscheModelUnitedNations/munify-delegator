import { sql, type SQL } from 'drizzle-orm';
import type { ColumnMeta } from '#lib/dataGrid/columnTypes';

/** `expr as "columnId"` for every column, in the order given. */
export function selectColumns({
	columns,
	valueOf
}: {
	columns: readonly ColumnMeta[];
	valueOf: (id: string) => SQL;
}) {
	return sql.join(
		columns.map((column) => sql`${valueOf(column.id)} as ${sql.identifier(column.id)}`),
		sql`, `
	);
}
