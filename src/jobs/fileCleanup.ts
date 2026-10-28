import { and, asc, eq, gt, inArray, lt, notExists, sql, type SQL } from 'drizzle-orm';
import { createStorage, type Storage } from '#api/handlers/storedFile/storageClient.js';
import { storageConfig } from './config';
import { db, schema } from './db';
import { DEFAULT_GRACE_HOURS, fileReferenceColumns, orphanedObjectKeys } from './fileReferences';

/** Files per page. */
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
 * Collects the unused files a page at a time, in id order: each page's objects are deleted from
 * the bucket, and only once that succeeded their rows. A failed bucket delete rolls the page back
 * and stops the job, so the rows stay for the next run; a run stopping between the two leaves rows
 * without objects, which the next run collects again (a missing object counts as deleted).
 *
 * The page's rows are locked before their objects go: a mutation storing one of them waits for
 * the lock (its foreign key check) and fails once the row is gone, instead of keeping a file
 * whose bytes were deleted. Whether they are still unused is asked again after locking, which
 * catches a reference that landed between the page's query and the lock.
 */
async function deleteFiles(storage: Storage, unused: SQL | undefined) {
	let deleted = 0;
	let after: string | undefined;
	for (;;) {
		const page = await db.transaction(async (tx) => {
			const locked = await tx
				.select({ id: file.id })
				.from(file)
				.where(and(unused, after === undefined ? undefined : gt(file.id, after)))
				.orderBy(asc(file.id))
				.limit(BATCH)
				.for('update');
			if (locked.length === 0) return undefined;
			const ids = locked.map((row) => row.id);

			const garbage = await tx
				.select({ id: file.id, key: file.key })
				.from(file)
				.where(and(inArray(file.id, ids), unused));
			await storage.delete(garbage.map((row) => row.key));
			if (garbage.length > 0) {
				await tx.delete(file).where(
					inArray(
						file.id,
						garbage.map((row) => row.id)
					)
				);
			}
			return { last: ids[ids.length - 1], deleted: garbage.length };
		});
		if (!page) return deleted;
		deleted += page.deleted;
		after = page.last;
	}
}

/** Objects in the bucket no file knows, older than `cutoff`. */
async function orphanedObjects(storage: Storage, cutoff: Date) {
	const knownKeys = new Set((await db.select({ key: file.key }).from(file)).map((row) => row.key));
	return orphanedObjectKeys(await storage.list(), knownKeys, cutoff);
}
