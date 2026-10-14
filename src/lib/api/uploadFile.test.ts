import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	requestFileUpload: vi.fn(async () => ({ fileId: 'f1', uploadUrl: 'https://s3.test/put' }))
}));

vi.mock('$lib/api/rumbleClient/client', () => ({ client: { mutate: mocks } }));

import { uploadFile } from './uploadFile';

const target = { kind: 'place', field: 'sitePlan', conferenceId: 'c1' } as const;
const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe('uploadFile', () => {
	test('leaves an untouched field alone', async () => {
		expect(await uploadFile(undefined, target)).toBeUndefined();
		expect(await uploadFile(new File([], 'empty.pdf'), target)).toBeUndefined();
		expect(mocks.requestFileUpload).not.toHaveBeenCalled();
	});

	test('announces the file, puts it with its type and returns its id', async () => {
		const file = new File(['%PDF'], 'plan.pdf', { type: 'application/pdf' });

		expect(await uploadFile(file, target)).toBe('f1');
		expect(mocks.requestFileUpload).toHaveBeenCalledWith(
			expect.objectContaining({
				__args: { ...target, fileName: 'plan.pdf', mimeType: 'application/pdf', size: 4 }
			})
		);
		expect(fetchMock).toHaveBeenCalledWith('https://s3.test/put', {
			method: 'PUT',
			body: file,
			headers: { 'Content-Type': 'application/pdf' }
		});
	});

	test('announces a file of unknown type as bytes', async () => {
		await uploadFile(new File(['x'], 'blob'), target);
		expect(mocks.requestFileUpload).toHaveBeenCalledWith(
			expect.objectContaining({
				__args: expect.objectContaining({ mimeType: 'application/octet-stream' })
			})
		);
	});

	test('fails when the storage refuses the file', async () => {
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
		await expect(uploadFile(new File(['x'], 'a.pdf'), target)).rejects.toThrow('a.pdf');
	});
});
