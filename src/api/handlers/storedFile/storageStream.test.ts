import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createStorage } from './storageClient';

const s3 = vi.hoisted(() => ({
	putObject: vi.fn(),
	getMultipartUploadId: vi.fn(),
	uploadPart: vi.fn(),
	completeMultipartUpload: vi.fn(),
	abortMultipartUpload: vi.fn(),
	getObjectRaw: vi.fn()
}));
vi.mock('s3mini', () => ({
	S3mini: function S3mini() {
		return s3;
	}
}));

const MB = 1024 * 1024;
const storage = () =>
	createStorage({
		endpoint: 'https://s3.example.org/bucket',
		accessKeyId: 'a',
		secretAccessKey: 's',
		region: 'r'
	});

/** So many bytes, in chunks as a request brings them. */
async function* body(size: number) {
	for (let at = 0; at < size; at += 65_536) {
		yield new Uint8Array(Math.min(65_536, size - at)).fill(Math.floor(at / 65_536) % 251);
	}
}
const put = (size: number) =>
	storage().putStream({ key: 'k', mimeType: 'application/pdf', body: body(size) });

/** What the parts stored have, all together, as it came in. */
const sizesOfParts = () => s3.uploadPart.mock.calls.map(([, , part]) => part.length);

beforeEach(() => {
	vi.resetAllMocks();
	s3.getMultipartUploadId.mockResolvedValue('upload');
	s3.uploadPart.mockImplementation(async (_key, _id, _part, partNumber) => ({
		partNumber,
		etag: `e${partNumber}`
	}));
	s3.abortMultipartUpload.mockResolvedValue(undefined);
});

describe('putStream', () => {
	test.each([0, 100, 8 * MB])('stores a small one at once (%i bytes)', async (size) => {
		expect(await put(size)).toBe(size);
		expect(s3.putObject.mock.calls[0][1].length).toBe(size);
		expect(s3.getMultipartUploadId).not.toHaveBeenCalled();
	});

	test.each([8 * MB + 1, 16 * MB, 30 * MB + 5])(
		'stores a large one part by part as it comes (%i bytes)',
		async (size) => {
			expect(await put(size)).toBe(size);
			const sizes = sizesOfParts();
			expect(sizes.slice(0, -1).every((each) => each === 8 * MB)).toBe(true);
			expect(sizes.reduce((sum, each) => sum + each, 0)).toBe(size);
			expect(s3.uploadPart.mock.calls.map(([, , , number]) => number)).toEqual(
				sizes.map((_, index) => index + 1)
			);
			expect(s3.completeMultipartUpload).toHaveBeenCalledOnce();
		}
	);

	test('stores every byte in its place', async () => {
		const stored: number[] = [];
		s3.uploadPart.mockImplementation(async (_key, _id, part, partNumber) => {
			for (let at = 0; at < part.length; at += 65_536) stored.push(part[at]);
			return { partNumber, etag: 'e' };
		});
		await put(20 * MB);
		expect(stored).toEqual(Array.from({ length: 320 }, (_, index) => index % 251));
	});

	test('leaves nothing behind of one that fails', async () => {
		s3.uploadPart.mockRejectedValueOnce(new Error('S3 is down'));
		await expect(put(20 * MB)).rejects.toThrow('S3 is down');
		expect(s3.abortMultipartUpload).toHaveBeenCalledWith('k', 'upload');
		expect(s3.completeMultipartUpload).not.toHaveBeenCalled();
	});
});

describe('readRange', () => {
	test('reads a part, and takes nothing else for one', async () => {
		s3.getObjectRaw.mockResolvedValueOnce(new Response(new Uint8Array([2, 3]), { status: 206 }));
		expect([...(await storage().readRange({ key: 'k', from: 1, to: 3 }))]).toEqual([2, 3]);
		expect(s3.getObjectRaw).toHaveBeenCalledWith('k', false, 1, 3);
		s3.getObjectRaw.mockResolvedValueOnce(new Response('gone', { status: 404 }));
		await expect(storage().readRange({ key: 'k', from: 1, to: 3 })).rejects.toThrow('404');
	});
});
