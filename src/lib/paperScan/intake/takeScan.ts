import { messageOf, PageError, ScanUnreadableError } from './errors';
import { openScan, scanPages, type ScanPage } from './openScan';
import type { PersonPages, ScanOwner } from './people';
import { problemsOfPages, type ScanProblem } from './problems';
import { cutName, type ScanFileType } from './scanFile';
import type { ScanSource } from './source';
import { takePage, type IntakePorts, type KeptPage, type TakenPage } from './takePage';

/** Taking in a whole file at once, page after page (`takePage`), as the browser does. */

interface ScanFile {
	name: string;
	source: ScanSource;
}

/** A person found in a file, and what became of their pages; nothing of somebody not taking part. */
export interface TakenPerson<P> {
	person: PersonPages;
	participant: P | undefined;
	kept: KeptPage[];
}

export interface TakenScan<P> {
	people: TakenPerson<P>[];
	problems: ScanProblem[];
}

interface Taking<P> {
	file: ScanFile;
	conferenceIds: ReadonlySet<string>;
	ports: IntakePorts<P> & {
		/** Told after each page. */
		onPage?: () => void;
		/** Told why a file could not be opened, for the log. */
		onUnreadable?: (error: unknown) => void;
	};
	owner?: ScanOwner;
}

/** Takes in a page cut out of the file, which some cannot be. */
async function takeCut<P>({
	taking: { file, conferenceIds, ports, owner },
	type,
	scanned: { page, cut }
}: {
	taking: Taking<P>;
	type: ScanFileType;
	scanned: ScanPage;
}): Promise<TakenPage<P>> {
	let bytes: Uint8Array<ArrayBuffer>;
	try {
		bytes = await cut();
	} catch (error) {
		if (!(error instanceof PageError)) throw error;
		return { page, problem: { reason: 'pageUnreadable' } };
	}
	const pageFile = { name: cutName({ name: file.name, type, page }), type, bytes };
	return takePage({ page, file: pageFile, conferenceIds, ports, owner });
}

/** The people of the pages taken, in the order they first come up. */
function peopleOf<P>(pages: readonly TakenPage<P>[]): TakenPerson<P>[] {
	const people = new Map<string, TakenPerson<P>>();
	for (const { person } of pages) {
		if (!person) continue;
		const { userId, conferenceId, page, participant, kept } = person;
		const key = `${conferenceId}:${userId}`;
		const theirs = people.get(key) ?? {
			person: { userId, conferenceId, pages: [] },
			participant,
			kept: []
		};
		theirs.person.pages.push(page);
		if (kept) theirs.kept.push(kept);
		people.set(key, theirs);
	}
	return [...people.values()];
}

/**
 * Takes in one file. What cannot be opened any further leaves what was taken of it. Throws what a port
 * throws, and where the file could not be read.
 */
export async function takeScan<P>(taking: Taking<P>): Promise<TakenScan<P>> {
	const { file, ports } = taking;
	const opened = await openScan(file.source);
	if (typeof opened === 'string') {
		return { people: [], problems: [{ file: file.name, pages: [], reason: opened }] };
	}
	const pages: TakenPage<P>[] = [];
	const unread: ScanProblem[] = [];
	try {
		for await (const scanned of scanPages({ source: file.source, type: opened.type })) {
			pages.push(await takeCut({ taking, type: opened.type, scanned }));
			ports.onPage?.();
		}
	} catch (error) {
		// anything else is no fault of the file's
		if (!(error instanceof ScanUnreadableError)) throw error;
		ports.onUnreadable?.(messageOf(error));
		unread.push({ file: file.name, pages: [], reason: 'fileUnreadable' });
	}
	return {
		people: peopleOf(pages),
		problems: [...problemsOfPages({ file: file.name, pages }), ...unread]
	};
}
