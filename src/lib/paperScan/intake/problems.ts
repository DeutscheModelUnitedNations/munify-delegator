import { m } from '#lib/paraglide/messages';

/** Why a page, or the whole file, came to nothing, or not to all it could. */
export type ScanProblemReason =
	| 'noCode'
	| 'otherCode'
	| 'otherPerson'
	| 'notRegistered'
	| 'pageUnreadable'
	| 'unreadable'
	| 'differs'
	| 'fileUnreadable'
	| 'fileTypeUnknown'
	| 'fileTooLarge'
	| 'failed';

/** One thing a delivery's owner is told about. */
export interface ScanProblem {
	file: string;
	/** From 1; empty for the whole file. */
	pages: number[];
	reason: ScanProblemReason;
	/** The conference its pages are of, where that is known. */
	conferenceId?: string;
}

/** What became of a page as far as it is told. */
export interface PageResult {
	page: number;
	problem?: Pick<ScanProblem, 'reason' | 'conferenceId'>;
	ignored?: 'blank' | 'noCode';
}

/**
 * What there is to tell of a file's pages: each problem once, with its pages. A page without a code is no
 * document and not told of, but a whole file of them is nobody's intention.
 */
export function problemsOfPages({
	file,
	pages
}: {
	file: string;
	pages: readonly PageResult[];
}): ScanProblem[] {
	const problems = new Map<string, ScanProblem>();
	for (const { page, problem } of pages.toSorted((a, b) => a.page - b.page)) {
		if (!problem) continue;
		const key = `${problem.reason}:${problem.conferenceId ?? ''}`;
		const told = problems.get(key) ?? { file, pages: [], ...problem };
		told.pages.push(page);
		problems.set(key, told);
	}
	const nothingFound = pages.every(({ ignored }) => ignored !== undefined);
	if (nothingFound && pages.some(({ ignored }) => ignored === 'noCode')) {
		return [{ file, pages: [], reason: 'noCode' }];
	}
	return [...problems.values()];
}

const REASONS: Record<ScanProblemReason, () => string> = {
	noCode: () => m.scanProblemNoCode(),
	otherCode: () => m.scanProblemOtherCode(),
	otherPerson: () => m.scanProblemOtherPerson(),
	notRegistered: () => m.scanProblemNotRegistered(),
	pageUnreadable: () => m.scanProblemPageUnreadable(),
	unreadable: () => m.scanProblemUnreadable(),
	differs: () => m.scanProblemDiffers(),
	fileUnreadable: () => m.scanProblemFileUnreadable(),
	fileTypeUnknown: () => m.scanProblemFileType(),
	fileTooLarge: () => m.scanProblemFileTooLarge(),
	failed: () => m.scanProblemFailed()
};

/** Page numbers as told: runs of them together, no more than say something. */
const MAX_RUNS = 30;
export function pageRuns(pages: readonly number[]) {
	const runs: { first: number; last: number }[] = [];
	for (const page of pages) {
		const run = runs.at(-1);
		if (run && run.last + 1 === page) run.last = page;
		else runs.push({ first: page, last: page });
	}
	const told = runs.slice(0, MAX_RUNS).map(({ first, last }) => {
		if (first === last) return `${first}`;
		return last === first + 1 ? `${first}, ${last}` : `${first}–${last}`;
	});
	return [...told, ...(runs.length > MAX_RUNS ? ['…'] : [])].join(', ');
}

/** What a person is told of a problem, in the locale it is asked in. */
export function describeScanProblem({ file, pages, reason }: ScanProblem) {
	const where = pages.length === 0 ? file : m.scanProblemPages({ file, pages: pageRuns(pages) });
	return `${where}: ${REASONS[reason]()}`;
}
