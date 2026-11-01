import { nanoid } from '../../../lib/helpers/nanoid';
import {
	createStorage,
	filePurpose,
	objectKey,
	type Storage
} from '../../handlers/storedFile/storageClient';
import type { SeedBatch } from './batch';

/** The bucket, configured like the app from `.env`: the seed runs outside SvelteKit. */
export function seedStorage(): Storage {
	const required = (name: string) => {
		const value = process.env[name];
		if (!value) throw new Error(`${name} is not set`);
		return value;
	};
	return createStorage({
		endpoint: required('S3_ENDPOINT'),
		publicEndpoint: process.env.S3_PUBLIC_ENDPOINT || undefined,
		accessKeyId: required('S3_ACCESS_KEY_ID'),
		secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
		region: process.env.S3_REGION || 'us-east-1'
	});
}

/**
 * Adds an uploaded file to the batch, as if the team had uploaded it for `kind`/`field` of the
 * conference, and returns its id for the row's file column.
 */
export function addSeedFile({
	batch,
	file
}: {
	batch: SeedBatch;
	file: {
		conferenceId: string;
		kind: string;
		field: string;
		bytes: Uint8Array;
		mimeType: string;
		fileName: string;
	};
}) {
	const id = nanoid();
	const purpose = filePurpose({ kind: file.kind, field: file.field });
	const key = objectKey({ conferenceId: file.conferenceId, purpose, uniqueId: id });
	batch.storedFile.push({
		id,
		key,
		purpose,
		mimeType: file.mimeType,
		size: file.bytes.length,
		fileName: file.fileName
	});
	batch.storedObject.push({ key, bytes: file.bytes, mimeType: file.mimeType });
	return id;
}

/**
 * Empties the bucket, like the reset empties the database, and writes the objects of the files
 * the batch added.
 */
export async function replaceSeedObjects({
	storage,
	batch
}: {
	storage: Storage;
	batch: SeedBatch;
}) {
	await storage.delete((await storage.list()).map((object) => object.key));
	for (const object of batch.storedObject) {
		await storage.put({ key: object.key, bytes: object.bytes, mimeType: object.mimeType });
	}
}
