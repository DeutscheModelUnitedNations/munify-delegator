import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { typstBrandingOf, writeTypstImage } from './typstBranding';

const { conferenceFindFirst, storedFileFindFirst, readStoredFile } = vi.hoisted(() => ({
	conferenceFindFirst: vi.fn(),
	storedFileFindFirst: vi.fn(),
	readStoredFile: vi.fn()
}));
vi.mock('#api/db/db', () => ({
	db: {
		query: {
			conference: { findFirst: conferenceFindFirst },
			storedFile: { findFirst: storedFileFindFirst }
		}
	}
}));
vi.mock('#api/handlers/storedFile/storedFileService', () => ({ readStoredFile }));

const png = new Uint8Array([137, 80, 78, 71]);

/** Stored files by id: their type and whether the bucket still has their bytes. */
function storedFiles(files: Record<string, { mimeType: string; missing?: boolean }>) {
	storedFileFindFirst.mockImplementation(({ where }: { where: { id: string } }) => {
		const file = files[where.id];
		return Promise.resolve(file ? { key: where.id, mimeType: file.mimeType } : undefined);
	});
	readStoredFile.mockImplementation((key: string) =>
		Promise.resolve(files[key]?.missing ? null : png)
	);
}

function conference(fields: {
	series?: string;
	logoFileId?: string | null;
	emblemFileId?: string | null;
	language?: string | null;
}) {
	conferenceFindFirst.mockResolvedValue({
		title: 'Konferenz 2027',
		language: fields.language ?? null,
		logoFileId: fields.logoFileId ?? null,
		emblemFileId: fields.emblemFileId ?? null,
		series: fields.series ? { abbreviation: fields.series } : null
	});
}

let dir: string;
beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), 'typst-branding-'));
	vi.clearAllMocks();
});
afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe('writeTypstImage', () => {
	test('writes a readable image with the extension Typst needs', async () => {
		storedFiles({ f1: { mimeType: 'image/png' } });
		expect(await writeTypstImage({ dir, fileId: 'f1', name: 'logo' })).toBe('logo.png');
		expect(new Uint8Array(await readFile(join(dir, 'logo.png')))).toEqual(png);
	});

	test('skips a missing file, a type Typst cannot read and lost bytes', async () => {
		storedFiles({
			webp: { mimeType: 'image/webp' },
			lost: { mimeType: 'image/png', missing: true }
		});
		expect(await writeTypstImage({ dir, fileId: 'none', name: 'a' })).toBeUndefined();
		expect(await writeTypstImage({ dir, fileId: 'webp', name: 'b' })).toBeUndefined();
		expect(await writeTypstImage({ dir, fileId: 'lost', name: 'c' })).toBeUndefined();
	});
});

describe('typstBrandingOf', () => {
	test('is undefined for an unknown conference', async () => {
		conferenceFindFirst.mockResolvedValue(undefined);
		expect(await typstBrandingOf({ conferenceId: 'x', dir })).toBeUndefined();
	});

	test('prints MUN-SH in its brand and language with the official mark', async () => {
		conference({ series: 'MUN-SH', language: 'eng', logoFileId: 'upload' });
		storedFiles({ upload: { mimeType: 'image/png' } });
		expect(await typstBrandingOf({ conferenceId: 'c', dir })).toEqual({
			conferenceName: 'Konferenz 2027',
			brand: 'mun-sh',
			lang: 'en',
			logo: { path: 'mun-sh-lang.svg', darkPath: 'mun-sh-lang-darkmode.svg', clearSpace: true }
		});
		expect(existsSync(join(dir, 'mun-sh-lang-darkmode.svg'))).toBe(true);
		// the uploaded logo is not needed
		expect(storedFileFindFirst).not.toHaveBeenCalled();
	});

	test('prints another conference with its uploaded logo, else its emblem', async () => {
		conference({ series: 'MUNOL', logoFileId: 'logo', emblemFileId: 'emblem' });
		storedFiles({ logo: { mimeType: 'image/webp' }, emblem: { mimeType: 'image/svg+xml' } });
		const branding = await typstBrandingOf({ conferenceId: 'c', dir });
		expect(branding?.brand).toBe('dmun');
		expect(branding?.lang).toBe('de');
		expect(branding?.logo).toEqual({ path: 'logo.svg', clearSpace: false });
	});

	test("gives a series conference without its own logo DMUN's mark", async () => {
		conference({ series: 'MUNOL' });
		expect((await typstBrandingOf({ conferenceId: 'c', dir }))?.logo).toEqual({
			path: 'dmun-lang.svg',
			darkPath: 'dmun-lang-darkmode.svg',
			clearSpace: true
		});
	});

	test("never gives a conference without a series DMUN's mark", async () => {
		conference({});
		expect((await typstBrandingOf({ conferenceId: 'c', dir }))?.logo).toBeUndefined();
	});
});
