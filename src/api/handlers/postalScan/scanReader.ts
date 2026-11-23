import { runComputeWorker } from '#api/services/computeWorker';
import type { ReadPage, ScanContent } from '#lib/paperScan/intake/pages';

/** A file's pages as the worker answers them, or why it could not be opened. */
export type ScanReading = { pages: ReadPage[] } | { failed: string };

/** Two hundred pages take a few minutes. */
const TIMEOUT_MS = 5 * 60_000;
/** In MB: a page at 300 dpi is 35, and several are held at once. */
const MAX_MEMORY_MB = 1024;

/**
 * Reads a delivered scan on a worker thread, so a stack of pages does not block the event loop.
 * Throws for a file that cannot be opened.
 */
export async function readScan(scan: ScanContent): Promise<ReadPage[]> {
	const reading = await runComputeWorker<ScanReading>({
		source: ['postalScan', 'scanReader.worker.ts'],
		bundle: 'scanReader',
		data: scan,
		timeoutMs: TIMEOUT_MS,
		resourceLimits: { maxOldGenerationSizeMb: MAX_MEMORY_MB }
	});
	if ('failed' in reading) throw new Error(reading.failed);
	return reading.pages;
}
