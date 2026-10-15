import { snakeCase, text, integer, index } from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps } from './helpers';
import { user } from './users';

/** Uploaded files: the bucket objects the app knows about. */

/**
 * A row's uploaded file. `restrict`, so a file is never deleted while anything points at it: the
 * file cleanup job deletes only the unreferenced ones, and a reference landing at the same moment
 * makes its delete fail instead of leaving a dangling key.
 */
export function fileRef() {
	return text().references(() => storedFile.id, { onDelete: 'restrict', onUpdate: 'cascade' });
}

/**
 * An uploaded file. The bytes live in the S3 bucket under `key`; this row is what the app knows
 * about them. A row is created when an upload is requested (`requestFileUpload`), and becomes a
 * file of some row when a mutation stores its id there (`conference.logoFileId`, …). Rows nothing
 * points at - uploads never used, replaced files, files of deleted rows - are removed together
 * with their objects by the `file-cleanup` job.
 */
export const storedFile = snakeCase.table(
	'stored_file',
	{
		...defaultIdAndTimestamps,
		/** The object's key in the bucket. */
		key: text().notNull().unique(),
		/** Which file this is (`conference/logo`, …), see `FILE_SOURCES`; it is only ever stored there. */
		purpose: text().notNull(),
		mimeType: text().notNull(),
		/** In bytes, as announced when the upload was requested and signed into its URL. */
		size: integer().notNull(),
		/** The name it was uploaded with, which downloads keep. */
		fileName: text(),
		/**
		 * The conference the file was uploaded for. Not a foreign key: the file outlives a deleted
		 * conference until the cleanup job removes its object.
		 */
		conferenceId: text().notNull(),
		uploadedById: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' })
	},
	(table) => [index('stored_file_created_at_idx').on(table.createdAt)]
);
