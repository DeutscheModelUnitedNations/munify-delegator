import type { PaperField } from '../fields';
import type { FieldReading } from '../readPaper';
import { fieldsOfCode } from '../readScan';
import type { SignedCodeCheck } from '#lib/signedCode/signedCode';
import type { ReadPage } from './pages';

/** A person's page: its number in the file (from 1), its code, and the fields on it, read. */
export interface PersonPage {
	page: number;
	/** The bare code; `null` for a page without one, which a person said whose it is. */
	code: string | null;
	fields: PaperField[];
	/** `null`: the fields were not readable. */
	readings: FieldReading[] | null;
}

/** A person's pages of one file, of their documents in one conference. */
export interface PersonPages {
	userId: string;
	conferenceId: string;
	pages: PersonPage[];
}

/** What was read off a person's pages, together. */
export const readingsOf = ({ pages }: PersonPages): FieldReading[] =>
	pages.flatMap(({ readings }) => readings ?? []);

/** The pages of a person whose fields were not readable, by number. */
export const unreadableOf = ({ pages }: PersonPages): number[] =>
	pages.flatMap(({ page, code, readings }) => (code !== null && !readings ? [page] : []));

/** Checks a code's signature. */
export type CheckCode = (text: string) => Promise<SignedCodeCheck | null>;

/** Whom a person said a file is of. */
export interface ScanOwner {
	userId: string;
	conferenceId: string;
}

/** The person a page is of: its first code that is ours, for documents of one of the conferences. */
async function personOf({
	page,
	conferenceIds,
	check
}: {
	page: ReadPage;
	conferenceIds: ReadonlySet<string>;
	check: CheckCode;
}) {
	let ours = false;
	for (const { text, readings } of page.codes) {
		const checked = await check(text);
		ours ||= checked !== null;
		if (!checked?.valid) continue;
		const { claims, code } = checked;
		if (claims.kind === 'print' && conferenceIds.has(claims.conferenceId)) {
			const { userId, conferenceId } = claims;
			return { userId, conferenceId, code, fields: fieldsOfCode(code), readings };
		}
	}
	return ours ? 'otherCode' : 'noCode';
}

const NO_CODE = { code: null, fields: [], readings: null };

/**
 * Whose a page is, told by its own code whatever the pages around it are, or why it is nobody's: no document
 * (`blank`, `noCode`), of another kind or conference (`otherCode`), or not readable. With an `owner`, who a
 * person said it is of, a page without a code is theirs.
 */
export async function placePage({
	page,
	conferenceIds,
	check,
	owner
}: {
	page: ReadPage;
	/** The conferences pages are taken of. */
	conferenceIds: ReadonlySet<string>;
	check: CheckCode;
	owner?: ScanOwner;
}): Promise<(PersonPage & ScanOwner) | 'blank' | 'noCode' | 'otherCode' | 'pageUnreadable'> {
	const found = await personOf({ page, conferenceIds, check });
	if (typeof found !== 'string') return { ...found, page: page.page };
	if (page.blank) return 'blank';
	if (found === 'otherCode') return 'otherCode';
	if (owner !== undefined) return { ...NO_CODE, ...owner, page: page.page };
	return page.error === undefined ? 'noCode' : 'pageUnreadable';
}
