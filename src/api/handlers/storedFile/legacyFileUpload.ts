import { sql } from 'drizzle-orm';
import type { db as appDb } from '#api/db/db';
import { logger } from '#lib/logger';
import type { Storage } from './storageClient';

/** Files per page; each page's bytes are held in memory while they are uploaded. */
const BATCH = 20;

type Db = typeof appDb;

/**
 * Puts the files the Prisma app stored inline (data URLs) into the bucket. The `stored_files`
 * migration turned each into a `stored_file` its row already points at, and left its bytes in
 * `legacy_file_upload`, outside the drizzle schema. The server's `init` hook awaits this, so no
 * request sees such a file before its object exists; once the table is gone it costs one query.
 *
 * A page at a time: its objects are put, then its staging rows deleted, so a start that fails
 * halfway goes on where it stopped (putting an object again is harmless, its key is its own).
 * Instances starting together skip each other's pages, and the last one done drops the table.
 *
 * TODO: remove (with the `init` hook in `hooks.server.ts`) once production has run it.
 */
export async function uploadLegacyFiles({ db, storage }: { db: Db; storage: Storage }) {
	if (!(await stagingTableExists(db))) return;
	const total = await uploadPages({ db, storage });
	if (await dropIfEmpty(db)) logger.info('Legacy files uploaded, staging table dropped', total);
}

async function uploadPages({ db, storage }: { db: Db; storage: Storage }) {
	const total = { files: 0, bytes: 0 };
	for (;;) {
		const page = await uploadPage({ db, storage });
		if (page.files === 0) return total;
		total.files += page.files;
		total.bytes += page.bytes;
		logger.info('Uploaded legacy files', total);
	}
}

async function stagingTableExists(db: Pick<Db, 'execute'>) {
	const { rows } = await db.execute<{ exists: boolean }>(
		sql`SELECT to_regclass('legacy_file_upload') IS NOT NULL AS exists`
	);
	return rows[0]?.exists ?? false;
}

/**
 * Uploads one page and deletes its staging rows. The rows stay locked meanwhile and another
 * instance skips them; a failed upload rolls the page back.
 */
function uploadPage({ db, storage }: { db: Db; storage: Storage }) {
	return db.transaction(async (tx) => {
		const { rows } = await tx.execute<{
			id: string;
			key: string;
			mime_type: string;
			bytes: Buffer;
		}>(
			sql`SELECT f.id, f.key, f.mime_type, l.bytes
				FROM legacy_file_upload l
				JOIN stored_file f ON f.id = l.stored_file_id
				ORDER BY f.id
				LIMIT ${BATCH}
				FOR UPDATE OF l SKIP LOCKED`
		);
		let bytes = 0;
		for (const row of rows) {
			await storage.put({ key: row.key, bytes: row.bytes, mimeType: row.mime_type });
			bytes += row.bytes.byteLength;
		}
		if (rows.length > 0) {
			await tx.execute(
				sql`DELETE FROM legacy_file_upload WHERE stored_file_id IN (${sql.join(
					rows.map((row) => sql`${row.id}`),
					sql`, `
				)})`
			);
		}
		return { files: rows.length, bytes };
	});
}

/**
 * Drops the staging table once it is empty. The table lock waits for an instance still uploading
 * a page, whose rows this one skipped, so the table only goes when nothing is left; an instance
 * arriving after it went finds nothing to do.
 */
function dropIfEmpty(db: Db) {
	return db.transaction(async (tx) => {
		if (!(await stagingTableExists(tx))) return false;
		await tx.execute(sql`LOCK TABLE legacy_file_upload IN ACCESS EXCLUSIVE MODE`);
		const { rows } = await tx.execute<{ empty: boolean }>(
			sql`SELECT NOT EXISTS (SELECT 1 FROM legacy_file_upload) AS empty`
		);
		if (!rows[0]?.empty) return false;
		await tx.execute(sql`DROP TABLE legacy_file_upload`);
		return true;
	});
}
