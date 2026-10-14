import { m } from '$lib/paraglide/messages';

type Nullable<T> = T | null | undefined;

interface LinkedAccount {
	givenName: string;
	familyName: string;
	globalNotes?: Nullable<string>;
}

/**
 * What a query selects of a person to know the care notes that apply to them: their own, and
 * those on accounts confirmed to be the same person (`possibleDuplicate`, status `CONFIRMED`).
 * Select it with `confirmedLinkedAccounts`.
 */
export interface WithLinkedAccounts {
	globalNotes?: Nullable<string>;
	duplicatesAsUser?: readonly { candidate: LinkedAccount }[];
	duplicatesAsCandidate?: readonly { user: LinkedAccount }[];
}

const accountFields = { givenName: true, familyName: true, globalNotes: true } as const;

/** The selection that brings a person's confirmed linked accounts along. */
export const confirmedLinkedAccounts = {
	duplicatesAsUser: { __args: { where: { status: 'CONFIRMED' } }, candidate: accountFields },
	duplicatesAsCandidate: { __args: { where: { status: 'CONFIRMED' } }, user: accountFields }
} as const;

/** The notes on the accounts confirmed to be the same person, with whose account carries them. */
export function linkedAccountNotes(person: WithLinkedAccounts) {
	const accounts = [
		...(person.duplicatesAsUser ?? []).map((pair) => pair.candidate),
		...(person.duplicatesAsCandidate ?? []).map((pair) => pair.user)
	];
	return accounts.flatMap((account) => {
		const note = account.globalNotes?.trim();
		return note ? [{ name: `${account.givenName} ${account.familyName}`, note }] : [];
	});
}

/**
 * Everything the care team has noted about the person, as one text: their own note, then those of
 * their linked accounts. Undefined when there is none.
 */
export function careNotesOf(person: WithLinkedAccounts): string | undefined {
	const own = person.globalNotes?.trim();
	const parts = [
		...(own ? [own] : []),
		...linkedAccountNotes(person).map(
			(linked) => `${m.linkedAccountNote({ name: linked.name })}\n${linked.note}`
		)
	];
	return parts.length > 0 ? parts.join('\n\n') : undefined;
}
