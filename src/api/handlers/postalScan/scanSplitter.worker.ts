import { PageError, ScanUnreadableError } from '#lib/paperScan/intake/errors';
import { openScan, scanPages, type ScanPage } from '#lib/paperScan/intake/openScan';
import type { ScanFileType } from '#lib/paperScan/intake/scanFile';
import type { ScanSource } from '#lib/paperScan/intake/source';
import { createInbox, runProcess, say, tookTooMuch } from './scanProcessWorker';
import type { SplitterQuestion, SplitterAnswer } from './scanSplitter';

/**
 * Splits a delivered scan into its pages in a process of its own (`./scanSplitter`). It asks for the parts of
 * the file it needs, and hands over page after page as each is taken: a file of any size is never in memory
 * as a whole, here or in the app. Development runs this file directly, production the bundle
 * `bun run build:compute` writes to `build/compute/`.
 */
const nextQuestion = createInbox<SplitterQuestion>();

const answer = (message: SplitterAnswer) => say(message);

/** The file, as its parts are sent. */
const sourceOf = (size: number): ScanSource => ({
	size,
	async read({ from, to }) {
		await answer({ read: { from, to } });
		const part = await nextQuestion();
		if (!('part' in part)) throw new Error('The file could not be read');
		return part.part;
	}
});

/** A page as it is handed over, or why it cannot be. */
async function answerOf({ page, type, cut }: ScanPage & { type: ScanFileType }) {
	try {
		return { page, type, bytes: await cut() };
	} catch (error) {
		if (!(error instanceof PageError)) throw error;
		return { page, broken: error.message };
	}
}

async function split({ size, from }: { size: number; from: number }) {
	const source = sourceOf(size);
	const opened = await openScan(source);
	if (typeof opened === 'string') return answer({ refused: opened });
	for await (const scanned of scanPages({ source, ...opened, from })) {
		await answer({ at: scanned.page });
		await answer(await answerOf({ ...scanned, ...opened }));
		// it is stored before the next is cut
		await nextQuestion();
		if (tookTooMuch()) return answer({ leaving: true });
	}
	return answer({ ended: true });
}

runProcess(async () => {
	const begin = await nextQuestion();
	if (!('size' in begin)) throw new Error('Nothing to split');
	try {
		await split(begin);
	} catch (error) {
		// anything else ends the process, and the splitting is tried again
		if (!(error instanceof ScanUnreadableError)) throw error;
		await answer({ unreadable: error.message });
	}
});
