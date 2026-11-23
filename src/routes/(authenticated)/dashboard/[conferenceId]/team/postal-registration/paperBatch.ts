import { ofAgeAtConference } from '#lib/helpers/ageChecker';
import formatNames from '#lib/helpers/formatNames';
import { planDetails, type StoredDetail } from '#lib/paperScan/agreementDetails';
import { readingsOf, unreadableOf, type PersonPages } from '#lib/paperScan/intake/people';
import type { KeptPage } from '#lib/paperScan/intake/takeScan';
import {
	proposePaperChange,
	type PaperChange,
	type PaperNote,
	type PostalStatus
} from '#lib/paperScan/proposal';
import { postalStatusOf } from './postalConfirm';

/** A person's line of a batch's report: what their pages changed, and what was left. */
export type PersonResult = {
	userId: string;
	name: string;
	pages: number;
	/** How many of their pages had no readable fields. */
	unreadable: number;
	change: PaperChange;
	notes: PaperNote[];
	/** Not registered in this conference (a test print): what was read is shown, nothing saved. */
	missing: boolean;
	/** How many of their pages were stored, took the place of an earlier scan, or were there already. */
	stored: number;
	replaced: number;
	known: number;
	error?: string;
};

/**
 * The report with a person's line of one more file: their pages and changes add up, and the notes
 * are the later file's, which were made knowing what the earlier one said.
 */
export function withResult({
	people,
	result
}: {
	people: readonly PersonResult[];
	result: PersonResult;
}): PersonResult[] {
	const before = people.find(({ userId }) => userId === result.userId);
	if (!before) return [...people, result];
	const merged = {
		...result,
		pages: before.pages + result.pages,
		unreadable: before.unreadable + result.unreadable,
		stored: before.stored + result.stored,
		replaced: before.replaced + result.replaced,
		known: before.known + result.known,
		change: { ...before.change, ...result.change },
		error: result.error ?? before.error
	};
	return people.map((person) => (person === before ? merged : person));
}

/** What is stored of a person, as their pages are told against it. */
interface StoredPerson extends PostalStatus {
	agreementDetails: readonly StoredDetail[];
	user: { givenName?: string | null; familyName?: string | null; birthday?: Date | null };
	conference: { startConference?: Date | null };
}

/** Whether the person is known to be under age at the conference: without a birthday nobody is. */
const isMinor = ({ user, conference }: StoredPerson) =>
	!!user.birthday &&
	!ofAgeAtConference({
		startConference: conference.startConference,
		dateOfBirth: user.birthday
	});

const nameOf = ({ user }: StoredPerson) =>
	formatNames({
		givenName: user.givenName ?? undefined,
		familyName: user.familyName ?? undefined
	});

/** How many pages became what, and why the first that failed did. */
function outcomesOf(kept: readonly KeptPage[]) {
	const count = (outcome: KeptPage['outcome']) =>
		kept.filter((page) => page.outcome === outcome).length;
	const [error] = kept.flatMap((page) => (page.outcome === 'failed' ? [page.error] : []));
	return {
		stored: count('stored'),
		replaced: count('replaced'),
		// the earlier scan of a page that says something else stays as well
		known: count('known') + count('differs'),
		error
	};
}

/**
 * What a person's pages say against what was stored (`row`, as it was before them): what taking them
 * in changed, and what became of each (`kept`).
 */
export function personReport({
	person,
	row,
	kept
}: {
	person: PersonPages;
	row: StoredPerson | undefined;
	kept: readonly KeptPage[];
}): PersonResult {
	const outcomes = outcomesOf(kept);
	const stored = row?.agreementDetails ?? [];
	const readings = readingsOf(person);
	const { change, notes } = proposePaperChange({
		readings,
		known: stored,
		status: postalStatusOf(row),
		confirm: false,
		minor: row !== undefined && isMinor(row)
	});
	const { differing } = planDetails({ readings, stored, confirm: false });
	return {
		userId: person.userId,
		name: row ? nameOf(row) : person.userId,
		pages: person.pages.length,
		unreadable: unreadableOf(person).length,
		// nothing was changed where a page could not be saved
		change: outcomes.error ? {} : change,
		notes: [...notes, ...differing.map((field) => ({ kind: 'detailDiffers' as const, field }))],
		missing: !row,
		...outcomes
	};
}
