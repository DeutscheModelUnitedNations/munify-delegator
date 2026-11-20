import type { FieldReading } from '#lib/paperScan/readPaper';
import type { PaperChange, PaperNote } from '#lib/paperScan/proposal';

/**
 * What a scanned page came to: read (its fields, `[]` for a page without any), its person known but
 * the page not wholly readable (a marker cut off or blurred), no code on it (a blank back), or a
 * code refused (another conference's, forged).
 */
export type PageOutcome =
	| { kind: 'read'; userId: string; readings: FieldReading[] }
	| { kind: 'unreadable'; userId: string }
	| { kind: 'noCode' }
	| { kind: 'refused'; message: string };

/** A scanned page: the file it came from and its page in it (from 1), and what it came to. */
export type ScannedPage = { file: string; page: number; outcome: PageOutcome };

/** A person's pages in a batch: how many, what was read off them, and how many were unreadable. */
export type PersonPages = {
	userId: string;
	pages: number;
	readings: FieldReading[];
	unreadable: number;
};

/** A person's line of a batch's report: what their pages changed, and what was left. */
export type PersonResult = {
	userId: string;
	name: string;
	pages: number;
	unreadable: number;
	change: PaperChange;
	notes: PaperNote[];
	/** Not registered in this conference (a test print): what was read is shown, nothing saved. */
	missing: boolean;
	error?: string;
};

/** The people a batch of pages belongs to, in the order they first came up. */
export function pagesByPerson(pages: readonly ScannedPage[]): PersonPages[] {
	const people = new Map<string, PersonPages>();
	for (const { outcome } of pages) {
		if (outcome.kind !== 'read' && outcome.kind !== 'unreadable') continue;
		const person = people.get(outcome.userId) ?? {
			userId: outcome.userId,
			pages: 0,
			readings: [],
			unreadable: 0
		};
		person.pages += 1;
		if (outcome.kind === 'read') person.readings.push(...outcome.readings);
		else person.unreadable += 1;
		people.set(outcome.userId, person);
	}
	return [...people.values()];
}

/** The pages that came to nothing anybody's: without a code, or with a refused one. */
export const strayPages = (pages: readonly ScannedPage[]) =>
	pages.filter(({ outcome }) => outcome.kind === 'noCode' || outcome.kind === 'refused');
