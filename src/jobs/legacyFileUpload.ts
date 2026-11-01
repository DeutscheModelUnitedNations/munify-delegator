import { sql } from 'drizzle-orm';
import { createStorage, type Storage } from '#api/handlers/storedFile/storageClient';
import { storageConfig } from './config';
import { db } from './db';
import { logger } from '#lib/logger';

/** Files per page; each page's bytes are held in memory while they are uploaded. */
const BATCH = 20;

/**
 * Puts the files the app stored inline before the bucket (data URLs) into it. The `stored_files`
 * migration turned each into a `stored_file` the row already points at, and left its bytes in
 * `legacy_file_upload`; until this has run, their download URLs find nothing. Run once after
 * deploying that migration.
 *
 * A page at a time: its objects are put, then its staging rows deleted, so a run that stops
 * halfway goes on where it stopped (putting an object again is harmless, its key is its own).
 * Once nothing is left, the staging table goes. With `dryRun` it only counts.
 */
export async function runLegacyFileUpload({ dryRun = false }: { dryRun?: boolean } = {}) {
	if (!(await stagingTableExists())) {
		logger.info('No legacy files to upload');
		return { files: 0, bytes: 0 };
	}
	return dryRun ? countStaged() : uploadAll();
}

async function countStaged() {
	const { rows } = await db.execute<{ files: number; bytes: number }>(
		sql`SELECT count(*)::int AS files, coalesce(sum(octet_length(bytes)), 0)::float8 AS bytes FROM legacy_file_upload`
	);
	const counts = rows[0] ?? { files: 0, bytes: 0 };
	logger.info('Would upload legacy files (dry run)', counts);
	return counts;
}

async function uploadAll() {
	const storage = createStorage(storageConfig());
	const total = { files: 0, bytes: 0 };
	for (;;) {
		const page = await uploadPage(storage);
		if (page.files === 0) break;
		total.files += page.files;
		total.bytes += page.bytes;
		logger.info('Uploaded legacy files', total);
	}
	const dropped = await dropIfEmpty();
	logger.info(
		dropped ? 'Legacy files uploaded, staging table dropped' : 'Legacy files uploaded',
		total
	);
	return total;
}

/**
 * Drops the staging table once it is empty. The table lock waits for a run still uploading a
 * page, whose rows this run skipped, so the table only goes when that run left nothing behind.
 */
function dropIfEmpty() {
	return db.transaction(async (tx) => {
		await tx.execute(sql`LOCK TABLE legacy_file_upload IN ACCESS EXCLUSIVE MODE`);
		const { rows } = await tx.execute<{ empty: boolean }>(
			sql`SELECT NOT EXISTS (SELECT 1 FROM legacy_file_upload) AS empty`
		);
		if (!rows[0]?.empty) return false;
		await tx.execute(sql`DROP TABLE legacy_file_upload`);
		return true;
	});
}

async function stagingTableExists() {
	const { rows } = await db.execute<{ exists: boolean }>(
		sql`SELECT to_regclass('legacy_file_upload') IS NOT NULL AS exists`
	);
	return rows[0]?.exists ?? false;
}

/**
 * Uploads one page and deletes its staging rows. The rows stay locked meanwhile and another run
 * skips them; a failed upload rolls the page back for the next run.
 */
function uploadPage(storage: Storage) {
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
			const ids = rows.map((row) => row.id);
			await tx.execute(
				sql`DELETE FROM legacy_file_upload WHERE stored_file_id IN (${sql.join(
					ids.map((id) => sql`${id}`),
					sql`, `
				)})`
			);
		}
		return { files: rows.length, bytes };
	});
}
