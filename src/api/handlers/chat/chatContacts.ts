import { db } from '#api/db/db';
import type * as schema from '#api/db/schema/index';

/**
 * How the people of a conference appear to each other in the chats: by the role they hold, never
 * by name. A contact is one seated person (a delegation member whose delegation holds a role, or a
 * single participant with one); several people sharing a role and committee are told apart by a
 * number.
 */

type RoleKind = (typeof schema.conferenceRoleKind.enumValues)[number];

export interface SeatedPerson {
	participantId: string;
	userId: string;
	suspended: boolean;
	delegationId: string | null;
	role: {
		id: string;
		kind: RoleKind;
		nationAlpha3Code: string | null;
		nation: { alpha2Code: string } | null;
		name: string | null;
		abbreviation: string | null;
		icon: string | null;
	};
	committee: { id: string; abbreviation: string; name: string } | null;
}

export interface Contact extends SeatedPerson {
	/** Which of several people with the same role and committee this is, from 1; null when alone. */
	ordinal: number | null;
}

/** Numbers the people who share a role and committee, in a stable order (their participant id). */
export function numberContacts(people: readonly SeatedPerson[]): Contact[] {
	const groups = new Map<string, SeatedPerson[]>();
	for (const person of people) {
		const key = `${person.role.id}/${person.committee?.id ?? ''}`;
		groups.set(key, [...(groups.get(key) ?? []), person]);
	}
	return [...groups.values()].flatMap((group) =>
		[...group]
			.sort((a, b) => a.participantId.localeCompare(b.participantId))
			.map((person, index) => ({ ...person, ordinal: group.length > 1 ? index + 1 : null }))
	);
}

/** Everybody holding a seat in the conference. */
async function loadSeatedPeople(conferenceId: string): Promise<SeatedPerson[]> {
	const role = {
		columns: {
			id: true,
			kind: true,
			nationAlpha3Code: true,
			name: true,
			abbreviation: true,
			icon: true
		},
		with: { nation: { columns: { alpha2Code: true } } }
	} as const;
	const participantColumns = { id: true, userId: true, messagingSuspended: true } as const;
	const [members, singles] = await Promise.all([
		db.query.delegationMember.findMany({
			where: { delegation: { conferenceId, assignedRoleId: { isNotNull: true } } },
			columns: { delegationId: true },
			with: {
				participant: { columns: participantColumns },
				delegation: { columns: {}, with: { assignedRole: role } },
				assignedCommittee: { columns: { id: true, abbreviation: true, name: true } }
			}
		}),
		db.query.singleParticipant.findMany({
			where: { participant: { conferenceId }, assignedRoleId: { isNotNull: true } },
			columns: {},
			with: {
				participant: { columns: participantColumns },
				assignedRole: role
			}
		})
	]);
	return [
		...members.flatMap((member) =>
			member.delegation.assignedRole
				? [
						{
							participantId: member.participant.id,
							userId: member.participant.userId,
							suspended: member.participant.messagingSuspended,
							delegationId: member.delegationId,
							role: member.delegation.assignedRole,
							committee: member.assignedCommittee
						}
					]
				: []
		),
		...singles.flatMap((single) =>
			single.assignedRole
				? [
						{
							participantId: single.participant.id,
							userId: single.participant.userId,
							suspended: single.participant.messagingSuspended,
							delegationId: null,
							role: single.assignedRole,
							committee: null
						}
					]
				: []
		)
	];
}

const CACHE_MS = 2000;
const cache = new Map<string, { at: number; contacts: Promise<Map<string, Contact>> }>();

/**
 * The conference's contacts by participant id. The same for every caller, so it is kept for a
 * moment: a chat list asks once per chat.
 */
export function conferenceContacts(conferenceId: string): Promise<Map<string, Contact>> {
	const cached = cache.get(conferenceId);
	if (cached && Date.now() - cached.at < CACHE_MS) return cached.contacts;
	const contacts = loadSeatedPeople(conferenceId).then(
		(people) =>
			new Map(numberContacts(people).map((contact) => [contact.participantId, contact] as const))
	);
	cache.set(conferenceId, { at: Date.now(), contacts });
	contacts.catch(() => cache.delete(conferenceId));
	return contacts;
}

/** Forgets what is kept, after a write that changes who is seated or suspended. */
export function forgetContacts(conferenceId: string) {
	cache.delete(conferenceId);
}
