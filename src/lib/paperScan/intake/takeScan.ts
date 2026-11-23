import { MAX_POSTAL_SCAN_SIZE } from '../limits';
import type { ReadPage, ScanContent } from './pages';
import {
	peopleOfPages,
	unreadableOf,
	type CheckCode,
	type PersonPage,
	type PersonPages,
	type ScanProblem
} from './people';
import type { KeptOutcome } from './rescan';
import {
	contentKeyOf,
	cutName,
	cutPage,
	hashOf,
	pageKeyOf,
	scanFileType,
	type ScanFileType
} from './scanFile';

/**
 * Taking in a scanned file, the same wherever it comes from: read it, tell whose pages they are,
 * keep each page as a scan of theirs, and say what came to nothing. How it is read, and where a
 * scan is kept, is the caller's (`IntakePorts`): the browser's for what a person drops or a watched
 * folder holds, the server's for what a scanner delivers.
 */

export interface ScanFile {
	name: string;
	bytes: Uint8Array<ArrayBuffer>;
}

/** A page of a file, as a file of its own. */
export interface CutScan {
	name: string;
	type: ScanFileType;
	bytes: Uint8Array<ArrayBuffer>;
}

/** What keeping a page is given. */
export interface KeepArgs<P> {
	participant: P;
	userId: string;
	page: PersonPage;
	/** Names the page, so the same one is not kept twice (`pageKeyOf`). */
	pageKey: string;
	/** Names the page of this file, for one without a code of its own. */
	contentKey: string;
	/** The page cut out of the file, only made when asked for. */
	cut: () => Promise<CutScan>;
}

/** What became of a page, or why it could not be kept. */
export type KeptPage = { outcome: KeptOutcome } | { outcome: 'failed'; error: string };

/** `P` is a person's part in the conference as the caller knows it. */
export interface IntakePorts<P> {
	/** Every page read; throws for a file that cannot be opened. */
	read: (scan: ScanContent) => Promise<ReadPage[]>;
	check: CheckCode;
	/** Who of these users takes part in the conference. */
	participants: (userIds: string[]) => Promise<ReadonlyMap<string, P>>;
	keep: (args: KeepArgs<P>) => Promise<KeptPage>;
	/** Told why a file could not be opened, for the log. */
	onUnreadable?: (error: unknown) => void;
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

/** The file opened as far as telling what it is; a problem when it is not taken at all. */
function openedScan({ bytes }: ScanFile): ScanContent | 'fileTooLarge' | 'fileTypeUnknown' {
	if (bytes.length > MAX_POSTAL_SCAN_SIZE) return 'fileTooLarge';
	const type = scanFileType(bytes);
	return type ? { bytes, type } : 'fileTypeUnknown';
}

/** Keeps a person's pages one by one. */
async function keepPages<P>({
	file,
	scan,
	pageCount,
	hash,
	person,
	participant,
	keep
}: {
	file: ScanFile;
	scan: ScanContent;
	pageCount: number;
	hash: string;
	person: PersonPages;
	participant: P;
	keep: IntakePorts<P>['keep'];
}): Promise<KeptPage[]> {
	const kept: KeptPage[] = [];
	for (const page of person.pages) {
		const cutting = { type: scan.type, page: page.page, pageCount };
		const contentKey = contentKeyOf({ hash, page: page.page });
		kept.push(
			await keep({
				participant,
				userId: person.userId,
				page,
				contentKey,
				pageKey: await pageKeyOf({ ...page, contentKey }),
				cut: async () => ({
					name: cutName({ name: file.name, ...cutting }),
					type: scan.type,
					bytes: await cutPage({ bytes: file.bytes, ...cutting })
				})
			})
		);
	}
	return kept;
}

/**
 * Takes in one file; `owner` is who a person said it is of, so a page of somebody else is refused.
 * Throws what a port throws, but for a file that cannot be read.
 */
export async function takeScan<P>({
	file,
	conferenceId,
	ports,
	owner
}: {
	file: ScanFile;
	conferenceId: string;
	ports: IntakePorts<P>;
	owner?: string;
}): Promise<TakenScan<P>> {
	const problem = (reason: ScanProblem['reason'], pages: number[] = []): ScanProblem => ({
		file: file.name,
		pages,
		reason
	});
	const scan = openedScan(file);
	if (typeof scan === 'string') return { people: [], problems: [problem(scan)] };

	let pages: ReadPage[];
	try {
		pages = await ports.read(scan);
	} catch (error) {
		ports.onUnreadable?.(error);
		return { people: [], problems: [problem('fileUnreadable')] };
	}

	const found = await peopleOfPages({ pages, conferenceId, check: ports.check, owner });
	const problems: ScanProblem[] = [];
	const report = (reason: ScanProblem['reason'], numbers: number[]) => {
		if (numbers.length > 0) problems.push(problem(reason, numbers));
	};
	report('noCode', found.stray.noCode);
	report('otherCode', found.stray.otherCode);

	const participants = await ports.participants(found.people.map(({ userId }) => userId));
	const hash = await hashOf(file.bytes);
	const people: TakenPerson<P>[] = [];
	for (const person of found.people) {
		const numbers = person.pages.map(({ page }) => page);
		const participant = participants.get(person.userId);
		const refused = owner !== undefined && owner !== person.userId;
		if (participant === undefined || refused) {
			report(refused ? 'otherPerson' : 'notRegistered', numbers);
			people.push({ person, participant: undefined, kept: [] });
			continue;
		}
		const kept = await keepPages({
			file,
			scan,
			pageCount: pages.length,
			hash,
			person,
			participant,
			keep: ports.keep
		});
		people.push({ person, participant, kept });
		report('unreadable', unreadableOf(person));
		report(
			'differs',
			numbers.filter((_, index) => kept[index].outcome === 'differs')
		);
	}
	return { people, problems };
}
