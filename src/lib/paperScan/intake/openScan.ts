import { MAX_POSTAL_SCAN_SIZE, MAX_SCAN_FILE_SIZE, MAX_SCAN_PAGES } from '../limits';
import { PageError, ScanUnreadableError } from './errors';
import { pdfPages } from './pdf/pages';
import { SIGNATURE_WITHIN, scanFileType, type ScanFileType } from './scanFile';
import type { ScanSource } from './source';

/** A page of a file, and how to get it as a file of its own. */
export interface ScanPage {
	/** Which page of the file, from 1. */
	page: number;
	/** Throws `PageError` where it cannot be a file of its own. */
	cut: () => Promise<Uint8Array<ArrayBuffer>>;
}

/** A file opened as far as telling what it is, or why it is not taken at all. */
export async function openScan(
	source: ScanSource
): Promise<{ type: ScanFileType } | 'fileTooLarge' | 'fileTypeUnknown'> {
	const head = await source.read({ from: 0, to: Math.min(SIGNATURE_WITHIN, source.size) });
	const type = scanFileType(head);
	if (!type) return 'fileTypeUnknown';
	const limit = type === 'application/pdf' ? MAX_SCAN_FILE_SIZE : MAX_POSTAL_SCAN_SIZE;
	return source.size > limit ? 'fileTooLarge' : { type };
}

/** A picture is one page. */
async function* picturePage({ source, from }: { source: ScanSource; from: number }) {
	if (from <= 1) yield { page: 1, cut: () => source.read({ from: 0, to: source.size }) };
}

/** Refuses a page too large to keep. */
const limited = ({ page, cut }: ScanPage): ScanPage => ({
	page,
	async cut() {
		const bytes = await cut();
		if (bytes.length > MAX_POSTAL_SCAN_SIZE) throw new PageError('A page too large');
		return bytes;
	}
});

/**
 * The pages of a file from page `from` (1) on, each a file of its own, so no more than one of them is in
 * memory. Throws `ScanUnreadableError` where the file cannot be opened, and `SourceReadError` where it
 * could not be read.
 */
export async function* scanPages({
	source,
	type,
	from = 1
}: {
	source: ScanSource;
	type: ScanFileType;
	from?: number;
}): AsyncGenerator<ScanPage> {
	const pages = type === 'application/pdf' ? pdfPages : picturePage;
	for await (const page of pages({ source, from })) {
		if (page.page > MAX_SCAN_PAGES) throw new ScanUnreadableError('Too many pages');
		yield limited(page);
	}
}
