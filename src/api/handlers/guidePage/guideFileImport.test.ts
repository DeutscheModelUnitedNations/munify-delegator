import { afterEach, describe, expect, test, vi } from 'vitest';

const stored = vi.hoisted(() => vi.fn(async () => 'file-1'));
vi.mock('../storedFile/storedFileService', () => ({ storeGeneratedFile: stored }));

import { importableUrl, importFileName, importGuideFile, importType } from './guideFileImport';

const hosts = ['guide.dmun.de', 'cdn.dmun.de'];

describe('importableUrl', () => {
	test('takes https on an allowed host only', () => {
		expect(
			importableUrl({ url: 'https://guide.dmun.de/content/images/a.png', hosts })?.hostname
		).toBe('guide.dmun.de');
		expect(importableUrl({ url: 'http://guide.dmun.de/a.png', hosts })).toBeUndefined();
		expect(importableUrl({ url: 'https://evil.example/a.png', hosts })).toBeUndefined();
		expect(
			importableUrl({ url: 'https://guide.dmun.de.evil.example/a.png', hosts })
		).toBeUndefined();
		expect(importableUrl({ url: 'https://user:pw@guide.dmun.de/a', hosts })).toBeUndefined();
		expect(importableUrl({ url: 'https://guide.dmun.de:8443/a', hosts })).toBeUndefined();
		expect(importableUrl({ url: 'not a url', hosts })).toBeUndefined();
	});
});

test('importType accepts images and PDFs', () => {
	expect(importType('image/png; charset=binary')).toBe('image/png');
	expect(importType('application/pdf')).toBe('application/pdf');
	expect(importType('text/html')).toBeUndefined();
	expect(importType(null)).toBeUndefined();
});

test('importFileName keeps the name and adds the extension', () => {
	expect(
		importFileName({
			url: new URL('https://cdn.dmun.de/files/Gremientext%20SR.pdf'),
			mimeType: 'application/pdf'
		})
	).toBe('Gremientext SR.pdf');
	expect(
		importFileName({ url: new URL('https://cdn.dmun.de/x/photo'), mimeType: 'image/jpeg' })
	).toBe('photo.jpg');
	expect(importFileName({ url: new URL('https://cdn.dmun.de/'), mimeType: 'image/png' })).toBe(
		'datei.png'
	);
});

describe('importGuideFile', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		stored.mockClear();
	});

	const respond = (responses: Response[]) => {
		const fetch = vi.fn(async () => responses.shift() ?? new Response(null, { status: 500 }));
		vi.stubGlobal('fetch', fetch);
		return fetch;
	};

	test('stores an allowed file, following redirects within the allowlist', async () => {
		const fetch = respond([
			new Response(null, { status: 302, headers: { location: 'https://cdn.dmun.de/a/karte.png' } }),
			new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } })
		]);
		await expect(
			importGuideFile({ conferenceId: 'c', url: 'https://guide.dmun.de/karte', hosts })
		).resolves.toEqual({ id: 'file-1', fileName: 'karte.png', mimeType: 'image/png', size: 3 });
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(stored).toHaveBeenCalledWith(
			expect.objectContaining({ conferenceId: 'c', purpose: 'guide/file', mimeType: 'image/png' })
		);
	});

	test('refuses a redirect off the allowlist, other types and empty files', async () => {
		respond([new Response(null, { status: 301, headers: { location: 'https://evil.example/x' } })]);
		await expect(
			importGuideFile({ conferenceId: 'c', url: 'https://guide.dmun.de/x', hosts })
		).rejects.toThrow();
		respond([new Response('<html>', { headers: { 'content-type': 'text/html' } })]);
		await expect(
			importGuideFile({ conferenceId: 'c', url: 'https://guide.dmun.de/x', hosts })
		).rejects.toThrow();
		respond([new Response(new Uint8Array(), { headers: { 'content-type': 'image/png' } })]);
		await expect(
			importGuideFile({ conferenceId: 'c', url: 'https://guide.dmun.de/x', hosts })
		).rejects.toThrow();
		respond([new Response(null, { status: 404 })]);
		await expect(
			importGuideFile({ conferenceId: 'c', url: 'https://guide.dmun.de/x', hosts })
		).rejects.toThrow();
		await expect(
			importGuideFile({ conferenceId: 'c', url: 'https://evil.example/x', hosts })
		).rejects.toThrow();
		expect(stored).not.toHaveBeenCalled();
	});

	test('refuses a file announced larger than the limit', async () => {
		respond([
			new Response('x', {
				headers: { 'content-type': 'application/pdf', 'content-length': '999999999' }
			})
		]);
		await expect(
			importGuideFile({ conferenceId: 'c', url: 'https://guide.dmun.de/big.pdf', hosts })
		).rejects.toThrow();
	});
});
