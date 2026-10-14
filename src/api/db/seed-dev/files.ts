import { nanoid } from '../../../lib/helpers/nanoid';
import { filePurpose, objectKey, type Storage } from '../../services/files/storageClient';
import type { SeedBatch } from './batch';

/**
 * Adds an uploaded file to the batch, as if the team had uploaded it for `kind`/`field` of the
 * conference, and returns its id for the row's file column.
 */
export function addSeedFile(
	batch: SeedBatch,
	file: {
		conferenceId: string;
		kind: string;
		field: string;
		bytes: Uint8Array;
		mimeType: string;
		fileName: string;
	}
) {
	const id = nanoid();
	const purpose = filePurpose(file.kind, file.field);
	const key = objectKey(file.conferenceId, purpose, id);
	batch.storedFile.push({
		id,
		key,
		purpose,
		mimeType: file.mimeType,
		size: file.bytes.length,
		fileName: file.fileName,
		conferenceId: file.conferenceId
	});
	batch.storedObject.push({ key, bytes: file.bytes, mimeType: file.mimeType });
	return id;
}

/**
 * Empties the bucket, like the reset empties the database, and writes the objects of the files
 * the batch added.
 */
export async function replaceSeedObjects(storage: Storage, batch: SeedBatch) {
	await storage.delete((await storage.list()).map((object) => object.key));
	for (const object of batch.storedObject) {
		await storage.put(object.key, object.bytes, object.mimeType);
	}
}
