import { is } from 'drizzle-orm';
import { getTableConfig, PgTable, type PgColumn } from 'drizzle-orm/pg-core';

/** How long an upload may wait for the mutation that claims it. */
export const DEFAULT_GRACE_HOURS = 24;

/**
 * Every column holding the id of a `stored_file`, found through the foreign keys, so a new file
 * field is covered the moment the schema declares it.
 */
export function fileReferenceColumns({
	tables,
	storedFile
}: {
	tables: Record<string, unknown>;
	storedFile: PgTable;
}) {
	const columns: { table: PgTable; column: PgColumn }[] = [];
	for (const table of Object.values(tables)) {
		if (!is(table, PgTable) || table === storedFile) continue;
		for (const foreignKey of getTableConfig(table).foreignKeys) {
			const reference = foreignKey.reference();
			if (reference.foreignTable !== storedFile) continue;
			for (const column of reference.columns) columns.push({ table, column });
		}
	}
	return columns;
}

/**
 * Objects in the bucket no `stored_file` knows, older than `cutoff`. Every upload's row is written
 * before its URL is handed out, and the cleanup deletes objects before their rows, so these are
 * left over from elsewhere: a database reset, or a row deleted by hand.
 */
export function orphanedObjectKeys({
	objects,
	knownKeys,
	cutoff
}: {
	objects: { key: string; lastModified: Date }[];
	knownKeys: ReadonlySet<string>;
	cutoff: Date;
}) {
	return objects
		.filter((object) => !knownKeys.has(object.key) && object.lastModified < cutoff)
		.map((object) => object.key);
}
