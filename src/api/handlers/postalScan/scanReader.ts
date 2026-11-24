import type { ReadPage, ScanContent } from '#lib/paperScan/intake/pages';
import { createScanProcess, type ScanProcess } from './scanProcess';

/** What the reading process is sent: a page. */
export type ReaderQuestion = ScanContent;
/** What it read of it, and whether it took too much memory to go on. */
export interface ReaderAnswer {
	page: ReadPage;
	leaving: boolean;
}

/** A process nobody asks anything for so long is let go. */
const IDLE_MS = 30_000;

/**
 * Reads pages in a process of their own, kept for as many as it has memory for. Asked one page at a time;
 * throws `ProcessEndedError` for a page that ends the process.
 */
export function createPageReader() {
	let process: ScanProcess<ReaderQuestion, ReaderAnswer> | undefined;
	let idle: ReturnType<typeof setTimeout> | undefined;

	function stop() {
		clearTimeout(idle);
		process?.stop();
		process = undefined;
	}

	return {
		async read(scan: ScanContent): Promise<ReadPage> {
			clearTimeout(idle);
			if (process?.ended) process = undefined;
			process ??= createScanProcess<ReaderQuestion, ReaderAnswer>('scanReader');
			process.tell(scan);
			try {
				const { page, leaving } = await process.next();
				if (leaving) process = undefined;
				return page;
			} catch (error) {
				stop();
				throw error;
			} finally {
				idle = setTimeout(stop, IDLE_MS);
				idle.unref();
			}
		},
		stop
	};
}
