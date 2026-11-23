import { m } from '#lib/paraglide/messages';
import type { PaperField } from '../fields';
import type { FieldReading } from '../readPaper';
import { fieldsOfCode } from '../readScan';
import type { SignedCodeCheck } from '#lib/signedCode/signedCode';
import type { ReadPage } from './pages';

/** Why a page (0: the whole file) came to nothing, or not to all it could. */
export type ScanProblemReason =
	| 'noCode'
	| 'otherCode'
	| 'otherPerson'
	| 'notRegistered'
	| 'unreadable'
	| 'differs'
	| 'fileUnreadable'
	| 'fileTypeUnknown'
	| 'fileTooLarge';

/** One thing a delivery's owner is told about. */
export interface ScanProblem {
	file: string;
	/** From 1; empty for the whole file. */
	pages: number[];
	reason: ScanProblemReason;
}

/** A person's page: its number in the file (from 1), its code, and the fields on it, read. */
export interface PersonPage {
	page: number;
	/** The bare code; `null` for a page without one, which a person said whose it is. */
	code: string | null;
	fields: PaperField[];
	/** `null`: the fields were not readable. */
	readings: FieldReading[] | null;
}

/** A person's pages of one file. */
export interface PersonPages {
	userId: string;
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

/** The person a page is of: its first code that is ours, for the conference's documents. */
async function personOf({
	page,
	conferenceId,
	check
}: {
	page: ReadPage;
	conferenceId: string;
	check: CheckCode;
}) {
	let ours = false;
	for (const { text, readings } of page.codes) {
		const checked = await check(text);
		ours ||= checked !== null;
		if (!checked?.valid) continue;
		const { claims, code } = checked;
		if (claims.kind === 'print' && claims.conferenceId === conferenceId) {
			return { userId: claims.userId, code, fields: fieldsOfCode(code), readings };
		}
	}
	return ours ? 'otherCode' : 'noCode';
}

const NO_CODE = { code: null, fields: [], readings: null };

/**
 * The people a file's pages belong to, in the order they first come up, and the pages that are
 * nobody's: without a code of ours (an empty back is left out), or with one of another kind or
 * conference.
 * With an `owner`, who a person said the file is of, a page without a code is theirs.
 */
export async function peopleOfPages({
	pages,
	conferenceId,
	check,
	owner
}: {
	pages: readonly ReadPage[];
	conferenceId: string;
	check: CheckCode;
	owner?: string;
}) {
	const people = new Map<string, PersonPages>();
	const stray: Record<'noCode' | 'otherCode', number[]> = { noCode: [], otherCode: [] };
	for (const page of pages) {
		const found = await personOf({ page, conferenceId, check });
		if (page.blank && typeof found === 'string') continue;
		const person = found === 'noCode' && owner ? { ...NO_CODE, userId: owner } : found;
		if (typeof person === 'string') {
			stray[person].push(page.page);
			continue;
		}
		const { userId, ...read } = person;
		const theirs = people.get(userId) ?? { userId, pages: [] };
		theirs.pages.push({ page: page.page, ...read });
		people.set(userId, theirs);
	}
	return { people: [...people.values()], stray };
}

const REASONS: Record<ScanProblemReason, () => string> = {
	noCode: () => m.scanProblemNoCode(),
	otherCode: () => m.scanProblemOtherCode(),
	otherPerson: () => m.scanProblemOtherPerson(),
	notRegistered: () => m.scanProblemNotRegistered(),
	unreadable: () => m.scanProblemUnreadable(),
	differs: () => m.scanProblemDiffers(),
	fileUnreadable: () => m.scanProblemFileUnreadable(),
	fileTypeUnknown: () => m.scanProblemFileType(),
	fileTooLarge: () => m.scanProblemFileTooLarge()
};

/** What a person is told of a problem, in the locale it is asked in. */
export function describeScanProblem({ file, pages, reason }: ScanProblem) {
	const where = pages.length === 0 ? file : m.scanProblemPages({ file, pages: pages.join(', ') });
	return `${where}: ${REASONS[reason]()}`;
}
