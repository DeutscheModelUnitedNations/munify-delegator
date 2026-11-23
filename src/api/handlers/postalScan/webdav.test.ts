// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MAX_POSTAL_SCAN_SIZE } from '#lib/paperScan/limits';
import { IntakeBusyError } from './intakeGate';
import { NotAllowedToDeliverError } from './scanIngest';
import { serveScanFolder } from './webdav';

const { findDeliverer, ingestScans } = vi.hoisted(() => ({
	findDeliverer: vi.fn(),
	ingestScans: vi.fn()
}));
vi.mock('#api/handlers/scannerAccess/scannerAccessService', () => ({ findDeliverer }));
vi.mock('#api/handlers/scannerAccess/scannerAccessPermissions', () => ({
	mayDeliver: async ({ role }: { role: string }) => role === 'PARTICIPANT_CARE'
}));
vi.mock('./scanIngest', () => ({
	ingestScans,
	NotAllowedToDeliverError: class NotAllowedToDeliverError extends Error {}
}));

const received: { name: string; bytes: Uint8Array }[] = [];
const deliverer = { accessId: 'a', role: 'PARTICIPANT_CARE' };

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
	ingestScans.mockImplementation(async ({ receive }) => received.push(...(await receive())));
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
		findDeliverer.mockResolvedValue({ ...deliverer, role: 'MEMBER' });
		expect((await send({ method: 'PUT', body: 'x' })).status).toBe(401);
		expect(ingestScans).not.toHaveBeenCalled();
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
		expect(ingestScans).toHaveBeenCalledWith(
			expect.objectContaining({ deliverer, source: 'WEBDAV' })
		);
		expect(received).toEqual([{ name: 'Stapel 1.pdf', bytes: new TextEncoder().encode('%PDF') }]);
	});

	test('takes an empty file for a trial, and refuses one too large', async () => {
		expect((await send({ method: 'PUT', body: '' })).status).toBe(201);
		const large = { 'content-length': String(MAX_POSTAL_SCAN_SIZE + 1) };
		expect((await send({ method: 'PUT', body: 'x', headers: large })).status).toBe(413);
		expect(received).toEqual([]);
	});

	test('asks to come back while too many wait, and says when it failed', async () => {
		ingestScans.mockRejectedValueOnce(new IntakeBusyError());
		const busy = await send({ method: 'PUT', body: 'x' });
		expect([busy.status, busy.headers.get('retry-after')]).toEqual([503, '60']);
		ingestScans.mockRejectedValueOnce(new NotAllowedToDeliverError());
		expect((await send({ method: 'PUT', body: 'x' })).status).toBe(403);
		ingestScans.mockRejectedValueOnce(new Error('S3 is down'));
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
		expect(ingestScans).not.toHaveBeenCalled();
	});
});
