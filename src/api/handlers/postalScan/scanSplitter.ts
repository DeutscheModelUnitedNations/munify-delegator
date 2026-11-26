import type { ScanProblemReason } from '#lib/paperScan/intake/problems';
import type { ScanFileType } from '#lib/paperScan/intake/scanFile';
import type { ScanSource } from '#lib/paperScan/intake/source';
import { createScanProcess, ProcessEndedError, type ScanProcess } from './scanProcess';

/** What the splitting process is told: which file, a part of it, or that a page was taken. */
export type SplitterQuestion =
	| { size: number; from: number }
	| { part: Uint8Array<ArrayBuffer> }
	| { failed: true }
	| { next: true };

/** What it says: which part it needs, the page it is at, that page, or how it ended. */
export type SplitterAnswer =
	| { read: { from: number; to: number } }
	| { at: number }
	| { page: number; type: ScanFileType; bytes: Uint8Array<ArrayBuffer> }
	| { page: number; broken: string }
	| { ended: true }
	| { leaving: true }
	| { unreadable: string }
	| { refused: Extract<ScanProblemReason, 'fileTooLarge' | 'fileTypeUnknown'> };

/** A page cut out of a file, or one that could not be. */
export type SplitPage =
	| { page: number; type: ScanFileType; bytes: Uint8Array<ArrayBuffer> }
	| { page: number; broken: string };

/** How the splitting of a file ended, but for failing. */
export type SplitEnding =
	'ended' | Extract<ScanProblemReason, 'fileUnreadable' | 'fileTooLarge' | 'fileTypeUnknown'>;

type Splitter = ScanProcess<SplitterQuestion, SplitterAnswer>;
type Ending = { kind: 'ended'; ending: SplitEnding } | { kind: 'leaving' } | { kind: 'crashed' };

/** Sends a part it asked for. What the source throws is thrown here: no process can make up for it. */
async function sendPart({
	splitter,
	source,
	range
}: {
	splitter: Splitter;
	source: ScanSource;
	range: { from: number; to: number };
}) {
	splitter.tell({ part: await source.read(range) });
}

/** How it ended, by what it said last. */
function endingOf(answer: SplitterAnswer): Ending | undefined {
	if ('ended' in answer) return { kind: 'ended', ending: 'ended' };
	if ('leaving' in answer) return { kind: 'leaving' };
	if ('unreadable' in answer) return { kind: 'ended', ending: 'fileUnreadable' };
	if ('refused' in answer) return { kind: 'ended', ending: answer.refused };
	return undefined;
}

/** Where the splitting of a file is, across its processes. */
interface Progress {
	/** The next page to cut. */
	next: number;
	/** The page a process was at when it ended. */
	at?: number;
}

/** The pages one process cuts, from where the splitting is. */
async function* pagesOfProcess({
	source,
	progress
}: {
	source: ScanSource;
	progress: Progress;
}): AsyncGenerator<SplitPage, Ending> {
	const splitter: Splitter = createScanProcess('scanSplitter');
	progress.at = undefined;
	try {
		splitter.tell({ size: source.size, from: progress.next });
		for (;;) {
			const answer = await splitter.next();
			const ending = endingOf(answer);
			if (ending) return ending;
			if ('read' in answer) await sendPart({ splitter, source, range: answer.read });
			if ('at' in answer) progress.at = answer.at;
			if ('page' in answer) {
				yield answer;
				progress.next = answer.page + 1;
				splitter.tell({ next: true });
			}
		}
	} catch (error) {
		if (!(error instanceof ProcessEndedError) || progress.at === undefined) throw error;
		return { kind: 'crashed' };
	} finally {
		splitter.stop();
	}
}

/**
 * The pages of a file from page `from` on, each in memory alone, cut in one process after another: each ends
 * once it took too much memory. A page that crashes two of them is told of as broken, and the others are cut.
 * Answers how the file ended; throws what reading it throws, and `ProcessEndedError` when a process ends
 * without getting to a page.
 */
export async function* splitScan({
	source,
	from
}: {
	source: ScanSource;
	from: number;
}): AsyncGenerator<SplitPage, SplitEnding> {
	const progress: Progress = { next: from };
	let suspect: number | undefined;
	for (;;) {
		const ending = yield* pagesOfProcess({ source, progress });
		if (ending.kind === 'ended') return ending.ending;
		if (ending.kind === 'leaving') continue;
		// the page it was at ended it, or something outside: once more tells
		if (suspect !== progress.next) {
			suspect = progress.next;
			continue;
		}
		yield { page: progress.next, broken: 'Cutting it ended the process' };
		progress.next += 1;
	}
}
