import { and, eq, inArray, lt, notExists, sql, type SQL } from 'drizzle-orm';
import { createStorage, type Storage } from '#api/handlers/storedFile/storageClient.js';
import { storageConfig } from './config';
import { db, schema } from './db';
import { DEFAULT_GRACE_HOURS, fileReferenceColumns, orphanedObjectKeys } from './fileReferences';

/** Rows deleted per statement. */
const BATCH = 500;

const file = schema.storedFile;

/**
 * Deletes the files nothing points at any more, older than `graceHours`: uploads never claimed,
 * files replaced by a new upload, and the files of deleted rows. Then the bucket is swept for
 * objects without a row.
 *
 * With `dryRun` it only counts. Returns the number of files and orphaned objects removed.
 */
export async function runFileCleanup(
	options: { graceHours?: number; dryRun?: boolean; now?: Date } = {}
): Promise<{ files: number; orphans: number }> {
	const { graceHours = DEFAULT_GRACE_HOURS, dryRun = false, now = new Date() } = options;
	const cutoff = new Date(now.getTime() - graceHours * 60 * 60 * 1000);
	const storage = createStorage(storageConfig());
	const unused = unusedSince(cutoff);

	const files = dryRun ? await db.$count(file, unused) : await deleteFiles(storage, unused);
	const orphans = await orphanedObjects(storage, cutoff);
	if (!dryRun) await storage.delete(orphans);

	console.info(
		`${files} unused files and ${orphans.length} orphaned objects ${dryRun ? 'would be deleted (dry run)' : 'deleted'}`
	);
	return { files, orphans: orphans.length };
}

/** Files created before `cutoff` that no column points at. */
function unusedSince(cutoff: Date) {
	return and(
		lt(file.createdAt, cutoff),
		...fileReferenceColumns(schema, file).map(({ table, column }) =>
			notExists(
				db
					.select({ one: sql`1` })
					.from(table)
					.where(eq(column, file.id))
			)
		)
	);
}

/**
 * Deletes the rows first, and only while still unused (the foreign keys `restrict`, so a
 * reference landing meanwhile fails the delete), then their objects.
 */
async function deleteFiles(storage: Storage, unused: SQL | undefined) {
	let deleted = 0;
	for (;;) {
		const batch = await db.select({ id: file.id }).from(file).where(unused).limit(BATCH);
		if (batch.length === 0) return deleted;
		const rows = await db
			.delete(file)
			.where(
				and(
					inArray(
						file.id,
						batch.map((row) => row.id)
					),
					unused
				)
			)
			.returning({ key: file.key });
		await storage.delete(rows.map((row) => row.key));
		deleted += rows.length;
	}
}

/** Objects in the bucket no file knows, older than `cutoff`. */
async function orphanedObjects(storage: Storage, cutoff: Date) {
	const knownKeys = new Set((await db.select({ key: file.key }).from(file)).map((row) => row.key));
	return orphanedObjectKeys(await storage.list(), knownKeys, cutoff);
}
