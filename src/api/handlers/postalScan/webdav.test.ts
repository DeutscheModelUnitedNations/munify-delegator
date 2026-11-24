// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MAX_SCAN_FILE_SIZE } from '#lib/paperScan/limits';
import { IntakeBusyError } from './intakeGate';
import { NotAllowedToDeliverError, ScanRefusedError, type IncomingScan } from './scanIngest';
import { serveScanFolder } from './webdav';

const { findDeliverer, ingestScan } = vi.hoisted(() => ({
	findDeliverer: vi.fn(),
	ingestScan: vi.fn()
}));
vi.mock('#api/handlers/scannerAccess/scannerAccessService', () => ({ findDeliverer }));
vi.mock('#api/handlers/scannerAccess/scannerAccessPermissions', () => ({
	mayDeliver: async ({ userId }: { userId: string }) => userId === 'ada'
}));
vi.mock('./scanIngest', () => ({
	ingestScan,
	NotAllowedToDeliverError: class NotAllowedToDeliverError extends Error {},
	ScanRefusedError: class ScanRefusedError extends Error {
		constructor(readonly status: number) {
			super();
		}
	}
}));

const received: { name: string; bytes: Uint8Array }[] = [];
const deliverer = { accessId: 'a', userId: 'ada' };

function send({
	method,
	path = '/api/scans/stack.pdf',
	login = 'scan-1:secret',
	body,
	headers = {}
}: {
	method: string;
	path?: string;
	login?: string | null;
	body?: string;
	headers?: Record<string, string>;
}) {
	const request = new Request(`https://example.org${path}`, {
		method,
		body,
		headers: {
			...headers,
			...(login === null ? {} : { authorization: `Basic ${btoa(login)}` })
		}
	});
	return serveScanFolder({ request, path });
}

beforeEach(() => {
	vi.resetAllMocks();
	findDeliverer.mockResolvedValue(deliverer);
	ingestScan.mockImplementation(async ({ open }: { open: () => IncomingScan }) => {
		const { name, body } = open();
		const chunks: Uint8Array[] = [];
		for await (const chunk of body) chunks.push(chunk);
		received.push({ name, bytes: new Uint8Array(Buffer.concat(chunks)) });
	});
	received.length = 0;
});

describe('signing in', () => {
	test('is asked for, and the password may hold colons', async () => {
		const refused = await send({ method: 'PUT', login: null, body: 'x' });
		expect(refused.status).toBe(401);
		expect(refused.headers.get('www-authenticate')).toContain('Basic');
		await send({ method: 'PROPFIND', path: '/api/scans/', login: 'scan-1:a:b' });
		expect(findDeliverer).toHaveBeenLastCalledWith({ username: 'scan-1', password: 'a:b' });
	});

	test('is refused for a wrong login, and once its owner may not deliver any more', async () => {
		findDeliverer.mockResolvedValue(undefined);
		expect((await send({ method: 'PUT', body: 'x' })).status).toBe(401);
		findDeliverer.mockResolvedValue({ ...deliverer, userId: 'left-the-team' });
		expect((await send({ method: 'PUT', body: 'x' })).status).toBe(401);
		expect(ingestScan).not.toHaveBeenCalled();
	});
});

describe('PUT', () => {
	test('takes the file in under its name', async () => {
		const answered = await send({
			method: 'PUT',
			path: '/api/scans/inbox/Stapel%201.pdf',
			body: '%PDF'
		});
		expect(answered.status).toBe(201);
		expect(ingestScan).toHaveBeenCalledWith(expect.objectContaining({ deliverer }));
		expect(received).toEqual([{ name: 'Stapel 1.pdf', bytes: new TextEncoder().encode('%PDF') }]);
	});

	test('refuses a file said to be too large, unread', async () => {
		const large = { 'content-length': String(MAX_SCAN_FILE_SIZE + 1) };
		expect((await send({ method: 'PUT', body: 'x', headers: large })).status).toBe(413);
		expect(ingestScan).not.toHaveBeenCalled();
	});

	test('reads on only as it is taken, and stops where it is not', async () => {
		let sent = 0;
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				sent += 1;
				controller.enqueue(new Uint8Array(1000));
			}
		});
		ingestScan.mockImplementationOnce(async ({ open }: { open: () => IncomingScan }) => {
			let taken = 0;
			for await (const chunk of open().body) {
				taken += chunk.length;
				if (taken === 5000) throw new ScanRefusedError(413);
			}
		});
		const request = new Request('https://example.org/api/scans/a.pdf', {
			method: 'PUT',
			body,
			// undici wants it for a stream; not in the DOM's types
			...{ duplex: 'half' },
			headers: { authorization: `Basic ${btoa('scan-1:secret')}` }
		});
		expect((await serveScanFolder({ request, path: '/api/scans/a.pdf' })).status).toBe(413);
		expect(sent).toBeLessThan(10);
	});

	test('gives up an upload of which nothing comes any more', async () => {
		vi.useFakeTimers();
		const body = new ReadableStream<Uint8Array>({ pull: () => new Promise(() => {}) });
		const request = new Request('https://example.org/api/scans/a.pdf', {
			method: 'PUT',
			body,
			...{ duplex: 'half' },
			headers: { authorization: `Basic ${btoa('scan-1:secret')}` }
		});
		const answered = serveScanFolder({ request, path: '/api/scans/a.pdf' });
		await vi.advanceTimersByTimeAsync(60_001);
		expect((await answered).status).toBe(503);
		vi.useRealTimers();
	});

	test('asks to come back while too many wait, and says when it failed', async () => {
		ingestScan.mockRejectedValueOnce(new IntakeBusyError());
		const busy = await send({ method: 'PUT', body: 'x' });
		expect([busy.status, busy.headers.get('retry-after')]).toEqual([503, '60']);
		ingestScan.mockRejectedValueOnce(new NotAllowedToDeliverError());
		expect((await send({ method: 'PUT', body: 'x' })).status).toBe(403);
		ingestScan.mockRejectedValueOnce(new ScanRefusedError(415));
		expect((await send({ method: 'PUT', body: 'x' })).status).toBe(415);
		ingestScan.mockRejectedValueOnce(new Error('S3 is down'));
		expect((await send({ method: 'PUT', body: 'x' })).status).toBe(500);
	});
});

describe('the folder', () => {
	test('says it speaks WebDAV without a login', async () => {
		const answered = await send({ method: 'OPTIONS', login: null });
		expect([answered.status, answered.headers.get('dav')]).toEqual([200, '1, 2']);
	});

	test('is there and empty, its files never are', async () => {
		const folder = await send({ method: 'PROPFIND', path: '/api/scans/a&b/' });
		expect(folder.status).toBe(207);
		expect(await folder.text()).toContain('<D:href>/api/scans/a&#38;b/</D:href>');
		expect((await send({ method: 'PROPFIND' })).status).toBe(404);
		expect((await send({ method: 'GET' })).status).toBe(404);
	});

	test.each([
		['MKCOL', 201],
		['MOVE', 201],
		['LOCK', 200],
		['UNLOCK', 204],
		['DELETE', 204],
		['COPY', 405]
	])('answers %s with %i, as devices ask around an upload', async (method, status) => {
		expect((await send({ method })).status).toBe(status);
		expect(ingestScan).not.toHaveBeenCalled();
	});
});
