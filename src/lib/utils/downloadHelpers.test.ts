import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { CsvDelimiter, CsvEncoding } from '$lib/state/csvSettings';

// The real state only persists in the browser; outside it, it keeps the value in memory.
vi.mock('$lib/state/csvSettings', () => ({
	csvSettings: {
		current: { delimiter: ';', encoding: 'utf-8' } satisfies {
			delimiter: CsvDelimiter;
			encoding: CsvEncoding;
		}
	}
}));

const { downloadCSV, downloadJSON, downloadPDF } = await import('./downloadHelpers');
const { csvSettings } = await import('$lib/state/csvSettings');

describe('download helpers', () => {
	let downloaded: { blob: Blob; filename: string }[];
	let lastBlob: Blob | undefined;

	beforeEach(() => {
		downloaded = [];
		URL.createObjectURL = vi.fn((blob: Blob) => {
			lastBlob = blob;
			return 'blob:test';
		});
		URL.revokeObjectURL = vi.fn();
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
			this: HTMLAnchorElement
		) {
			if (lastBlob) downloaded.push({ blob: lastBlob, filename: this.download });
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const bytes = async (blob: Blob) => [...new Uint8Array(await blob.arrayBuffer())];

	function useSettings(delimiter: CsvDelimiter, encoding: CsvEncoding) {
		csvSettings.current = { delimiter, encoding };
	}

	test('writes plain UTF-8 CSV with the stored delimiter', async () => {
		useSettings(';', 'utf-8');
		downloadCSV(['Name', 'Land'], [['Erika', 'Deutschland']], 'out.csv');

		const [{ blob, filename }] = downloaded;
		expect(filename).toBe('out.csv');
		expect(blob.type).toBe('text/csv;charset=utf-8');
		expect(await blob.text()).toBe('Name;Land\nErika;Deutschland\n');
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
	});

	test('lets the caller override the delimiter', async () => {
		useSettings(';', 'utf-8');
		downloadCSV(['a', 'b'], [], 'out.csv', '\t');
		expect(await downloaded[0].blob.text()).toBe('a\tb\n');
	});

	test('prefixes a byte order mark for Excel', async () => {
		useSettings(',', 'utf-8-bom');
		downloadCSV(['ä'], [], 'out.csv');

		const { blob } = downloaded[0];
		expect(blob.type).toBe('text/csv;charset=utf-8');
		expect((await bytes(blob)).slice(0, 3)).toEqual([0xef, 0xbb, 0xbf]);
	});

	test('encodes ISO-8859-1 one byte per character, replacing what it cannot hold', async () => {
		useSettings(',', 'iso-8859-1');
		downloadCSV(['ä€'], [], 'out.csv');

		const { blob } = downloaded[0];
		expect(blob.type).toBe('text/csv;charset=iso-8859-1');
		expect(await bytes(blob)).toEqual([0xe4, 0x3f, 0x0a]);
	});

	test('downloads JSON, pretty-printed', async () => {
		downloadJSON({ a: 1 }, 'data.json');
		const [{ blob, filename }] = downloaded;
		expect(filename).toBe('data.json');
		expect(blob.type).toBe('application/json');
		expect(await blob.text()).toBe('{\n  "a": 1\n}');
	});

	test('downloads PDF bytes', async () => {
		downloadPDF(new Uint8Array([37, 80, 68, 70]), 'doc.pdf');
		const [{ blob, filename }] = downloaded;
		expect(filename).toBe('doc.pdf');
		expect(blob.type).toBe('application/pdf');
		expect(await bytes(blob)).toEqual([37, 80, 68, 70]);
	});
});
