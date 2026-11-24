import { describe, expect, test, vi } from 'vitest';
import type { Picture } from '../picture';
import { readScanPage, type ScanPlatform } from './pages';

const empty: Picture = { width: 10, height: 10, data: new Uint8ClampedArray(400).fill(255) };

/** A platform on which a picture opens, unless told otherwise. */
const platform = (overrides: Partial<ScanPlatform<object>>): ScanPlatform<object> => ({
	openPdf: vi.fn(),
	openImage: async () => ({ width: 10, height: 10, drawOn: () => {}, close: () => {} }),
	createCanvas: () => ({}),
	releaseCanvas: () => undefined,
	forPdf: () => document.createElement('canvas'),
	pictureOf: () => empty,
	readCodes: async () => [],
	...overrides
});

const picture = { bytes: new Uint8Array([1]), type: 'image/png' as const };
const read = (overrides: Partial<ScanPlatform<object>>) =>
	readScanPage({ scan: picture, platform: platform(overrides) });
const failing = (message: string) => async () => {
	throw new Error(message);
};

describe('readScanPage', () => {
	test('reads a page, and tells an empty one', async () => {
		expect(await read({})).toEqual([{ page: 1, blank: true, codes: [] }][0]);
	});

	test('frees what the page was drawn on, also when that fails', async () => {
		const releaseCanvas = vi.fn();
		await read({ releaseCanvas });
		await read({
			releaseCanvas,
			pictureOf: () => {
				throw new Error('no memory');
			}
		}).catch(() => undefined);
		expect(releaseCanvas).toHaveBeenCalledTimes(2);
	});

	test('says what is wrong with a page that cannot be opened or read', async () => {
		const broken = { page: 1, blank: false, codes: [] };
		expect(await read({ readCodes: failing('broken picture') })).toEqual({
			...broken,
			error: 'broken picture'
		});
		expect(await read({ openImage: failing('not a picture') })).toEqual({
			...broken,
			error: 'not a picture'
		});
	});

	test('throws where what opens it could not be loaded: that is not the page’s fault', async () => {
		const reading = readScanPage({
			scan: { ...picture, type: 'application/pdf' },
			platform: platform({ openPdf: failing('could not load pdf.js') })
		});
		await expect(reading).rejects.toThrow('could not load pdf.js');
	});
});
