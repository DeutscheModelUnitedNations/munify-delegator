import { describe, expect, test } from 'vitest';
import * as schema from '#api/db/schema/index';
import { fileReferenceColumns, orphanedObjectKeys } from './fileReferences';

describe('fileReferenceColumns', () => {
	test('finds every column pointing at a stored file', () => {
		const columns = fileReferenceColumns({ tables: schema, storedFile: schema.storedFile }).map(
			({ column }) => column
		);
		expect(columns).toEqual(
			expect.arrayContaining([
				schema.conference.logoFileId,
				schema.conference.certificateFileId,
				schema.place.sitePlanFileId,
				schema.resolution.fileId
			])
		);
		expect(columns).toHaveLength(10);
	});
});

describe('orphanedObjectKeys', () => {
	const cutoff = new Date('2026-10-01T00:00:00Z');
	const before = new Date('2026-09-30T00:00:00Z');
	const after = new Date('2026-10-02T00:00:00Z');

	test('picks old objects no stored file knows', () => {
		expect(
			orphanedObjectKeys({
				objects: [
					{ key: 'known', lastModified: before },
					{ key: 'orphan', lastModified: before },
					{ key: 'fresh', lastModified: after }
				],
				knownKeys: new Set(['known']),
				cutoff
			})
		).toEqual(['orphan']);
	});
});
