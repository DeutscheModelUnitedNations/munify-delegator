import { hashOf, contentKeyOf, pageKeyOf, type ScanFileType } from './scanFile';
import type { ReadPage, ScanContent } from './pages';
import { placePage, type CheckCode, type PersonPage, type ScanOwner } from './people';
import type { ScanProblem } from './problems';
import type { KeptOutcome } from './rescan';

/**
 * Taking in a page, the same wherever it comes from: read it, tell whose it is, keep it as a scan of theirs.
 * A page stands by itself: a stack mixes people and conferences as it likes, and no more than the page is in
 * memory. How it is read, and where it is kept, is the caller's (`IntakePorts`): the browser's for what a
 * person drops or a watched folder holds, the server's for what a scanner delivers.
 */

/** A page, as a file of its own. */
export interface PageFile {
	name: string;
	type: ScanFileType;
	bytes: Uint8Array<ArrayBuffer>;
}

/** What keeping a page is given. */
export interface KeepArgs<P> {
	participant: P;
	userId: string;
	/** The conference the page is of. */
	conferenceId: string;
	page: PersonPage;
	/** Names the page, so the same one is not kept twice (`pageKeyOf`). */
	pageKey: string;
	/** Names the page by its file, for one without a code of its own. */
	contentKey: string;
	/** The page's file, the right way up. */
	file: PageFile;
	/** Whether it had to be turned for that: it is not the file the page came as. */
	turned: boolean;
}

/** What became of a page, or why it could not be kept. */
export type KeptPage = { outcome: KeptOutcome } | { outcome: 'failed'; error: string };

/** `P` is a person's part in the conference as the caller knows it. */
export interface IntakePorts<P> {
	/** Reads a page; one that cannot be read says so (`error`). */
	read: (page: ScanContent) => Promise<ReadPage>;
	check: CheckCode;
	/** A user's part in a conference, if they take part. */
	participant: (who: { userId: string; conferenceId: string }) => Promise<P | undefined>;
	keep: (args: KeepArgs<P>) => Promise<KeptPage>;
}

/** What became of a page: whose it is, what there is to tell of it, or that it is no document. */
export interface TakenPage<P> {
	page: number;
	person?: {
		userId: string;
		conferenceId: string;
		page: PersonPage;
		participant: P | undefined;
		/** Nothing of somebody not taking part. */
		kept: KeptPage | undefined;
	};
	problem?: Pick<ScanProblem, 'reason' | 'conferenceId'>;
	ignored?: 'blank' | 'noCode';
}

/** A page's file as it is kept: turned `upright`, where it did not lie so. */
const asKept = ({ file, upright }: { file: PageFile; upright: ReadPage['upright'] }) => ({
	file: { ...file, bytes: upright ?? file.bytes },
	turned: upright !== undefined
});

/** What there is to tell of a page kept. */
function problemOf({
	kept,
	page: { code, readings }
}: {
	kept: KeptPage;
	page: PersonPage;
}): ScanProblem['reason'] | undefined {
	if (kept.outcome === 'differs') return 'differs';
	return code !== null && !readings ? 'unreadable' : undefined;
}

/**
 * Takes in page `page` of a file, of any of the conferences; `owner` is who a person said it is of, so a
 * page of somebody else is refused. Throws what a port throws.
 */
export async function takePage<P>({
	page: number,
	file,
	conferenceIds,
	ports,
	owner
}: {
	page: number;
	file: PageFile;
	conferenceIds: ReadonlySet<string>;
	ports: IntakePorts<P>;
	owner?: ScanOwner;
}): Promise<TakenPage<P>> {
	const read = await ports.read({ bytes: file.bytes, type: file.type });
	const placed = await placePage({
		page: { ...read, page: number },
		conferenceIds,
		check: ports.check,
		owner
	});
	if (placed === 'blank' || placed === 'noCode') return { page: number, ignored: placed };
	if (typeof placed === 'string') return { page: number, problem: { reason: placed } };

	const { userId, conferenceId, ...page } = placed;
	const who = { userId, conferenceId, page };
	const refused = owner !== undefined && owner.userId !== userId;
	const participant = refused ? undefined : await ports.participant({ userId, conferenceId });
	if (participant === undefined) {
		const reason = refused ? 'otherPerson' : 'notRegistered';
		const person = { ...who, participant, kept: undefined };
		return { page: number, person, problem: { reason, conferenceId } };
	}
	// by the file as it came, which is the same each time
	const contentKey = contentKeyOf({ hash: await hashOf(file.bytes), page: number });
	const kept = await ports.keep({
		participant,
		userId,
		conferenceId,
		page,
		pageKey: await pageKeyOf({ ...page, contentKey }),
		contentKey,
		...asKept({ file, upright: read.upright })
	});
	const reason = problemOf({ kept, page });
	return {
		page: number,
		person: { ...who, participant, kept },
		...(reason && { problem: { reason, conferenceId } })
	};
}
