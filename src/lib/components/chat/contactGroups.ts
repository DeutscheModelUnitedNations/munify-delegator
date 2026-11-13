import { contactName, type ContactLabelSource } from './chatLabels';

/** The group of everybody seated without a committee: non-state actors and single participants. */
export const OTHER_GROUP = 'other';

type GroupedContact = ContactLabelSource & { participantId: string; committeeId?: string | null };

export interface ContactGroup<C> {
	/** The committee's id, or `OTHER_GROUP` */
	key: string;
	/** The committee's abbreviation */
	label: string;
	name: string;
	contacts: C[];
}

/**
 * The contacts by committee, committees by abbreviation and the people without one last; within a
 * group by the role's name in the reader's language, then by their number.
 */
export function groupContacts<C extends GroupedContact>(contacts: readonly C[]): ContactGroup<C>[] {
	const groups = new Map<string, ContactGroup<C>>();
	for (const contact of contacts) {
		const key = contact.committeeId ?? OTHER_GROUP;
		const group = groups.get(key) ?? {
			key,
			label: contact.committeeAbbreviation ?? '',
			name: contact.committeeName ?? '',
			contacts: []
		};
		group.contacts.push(contact);
		groups.set(key, group);
	}
	const byName = (a: C, b: C) =>
		contactName(a).localeCompare(contactName(b)) || (a.ordinal ?? 0) - (b.ordinal ?? 0);
	return [...groups.values()]
		.map((group) => ({ ...group, contacts: [...group.contacts].sort(byName) }))
		.sort(
			(a, b) =>
				Number(a.key === OTHER_GROUP) - Number(b.key === OTHER_GROUP) ||
				a.label.localeCompare(b.label)
		);
}
