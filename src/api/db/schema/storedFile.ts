import { snakeCase, text, integer, index } from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps } from './helpers';
import { user } from './users';

/**
 * A row's uploaded file. Nothing here deletes a file: once no row points at it any more, the
 * `file-cleanup` job collects it, and `no action` keeps a file in use from being deleted.
 *
 * Every column holding a file id must be built with this. The job finds what points at a file
 * through the schema's foreign keys (`fileReferenceColumns`, `src/jobs/fileReferences.ts`), so a
 * file id kept anywhere without one - a plain `text()` column, json - looks unused to it, and the
 * job deletes a file that is still in use.
 */
export function fileRef() {
	return text().references(() => storedFile.id, { onDelete: 'no action', onUpdate: 'cascade' });
}

/**
 * Uploaded files: the bucket objects the app knows about. A file belongs to whatever rows point at
 * it through a `fileRef()` column; one nothing points at (an upload never claimed, a replaced file,
 * the file of a deleted row) is garbage, which the `file-cleanup` job removes from the bucket and
 * then from here. A new table holding files needs nothing more than `fileRef()` for that.
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
		uploadedById: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' })
	},
	(table) => [index('stored_file_created_at_idx').on(table.createdAt)]
);
