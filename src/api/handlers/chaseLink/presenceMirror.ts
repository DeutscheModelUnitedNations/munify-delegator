import { CHASE_PRESENCE_SCHEMA_URL, type ChasePresence } from '#lib/schemata/chasePresence';

/**
 * CHASE's presence records of one conference, in the shape of CHASE's presence export
 * (`chasePresenceSchema`), so the attendance import page scores them like an uploaded file. Only
 * delegates and non-state actors have presence; the rest of the conference is left out.
 */

export interface ChaseRepresentation {
	id: string;
	type: 'DELEGATION' | 'NSA' | 'UN';
	alpha2Code?: string | null;
	alpha3Code?: string | null;
	faIcon?: string | null;
	name?: string | null;
}

export interface ChasePresenceUser {
	conferenceUserType: string;
	userEmail: string;
	committeeMember?: { committeeId: string; representation?: ChaseRepresentation | null } | null;
	conferenceMember?: { representation?: ChaseRepresentation | null } | null;
	presenceEvents: readonly {
		id: string;
		committeeId: string;
		present: boolean;
		type: string;
		timestamp: Date | string;
	}[];
}

/**
 * CHASE's tables of one conference as the link worker keeps them (`liveTable`), rows pointing at
 * each other by id.
 */
export interface ChasePresenceTables {
	users: readonly {
		id: string;
		conferenceUserType: string;
		userEmail: string;
		committeeMemberId?: string | null;
		conferenceMemberId?: string | null;
	}[];
	committeeMembers: readonly { id: string; committeeId: string; representationId: string }[];
	conferenceMembers: readonly { id: string; representationId: string }[];
	representations: readonly ChaseRepresentation[];
	events: readonly (ChasePresenceUser['presenceEvents'][number] & { conferenceUserId: string })[];
}

/** The tables put together per person, as `presenceFromChase` takes them. */
export function joinPresence(tables: ChasePresenceTables): ChasePresenceUser[] {
	const representations = new Map(tables.representations.map((row) => [row.id, row]));
	const committeeMembers = new Map(tables.committeeMembers.map((row) => [row.id, row]));
	const conferenceMembers = new Map(tables.conferenceMembers.map((row) => [row.id, row]));
	const eventsOf = Map.groupBy(tables.events, (event) => event.conferenceUserId);
	return tables.users.map((user) => {
		const seat = user.committeeMemberId ? committeeMembers.get(user.committeeMemberId) : undefined;
		const member = user.conferenceMemberId
			? conferenceMembers.get(user.conferenceMemberId)
			: undefined;
		return {
			conferenceUserType: user.conferenceUserType,
			userEmail: user.userEmail,
			committeeMember: seat && {
				committeeId: seat.committeeId,
				representation: representations.get(seat.representationId)
			},
			conferenceMember: member && { representation: representations.get(member.representationId) },
			presenceEvents: (eventsOf.get(user.id) ?? [])
				.toSorted((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
				.map(({ id, committeeId, present, type, timestamp }) => ({
					id,
					committeeId,
					present,
					type,
					timestamp
				}))
		};
	});
}

function representationOf(representation: ChaseRepresentation | null | undefined) {
	if (!representation) return null;
	return {
		id: representation.id,
		type: representation.type,
		alpha2Code: representation.alpha2Code ?? null,
		alpha3Code: representation.alpha3Code ?? null,
		faIcon: representation.faIcon ?? null,
		name: representation.name ?? null
	};
}

export function presenceFromChase({
	conferenceId,
	users,
	now
}: {
	conferenceId: string;
	users: readonly ChasePresenceUser[];
	now: Date;
}): ChasePresence {
	return {
		$schema: CHASE_PRESENCE_SCHEMA_URL,
		exportedAt: now.toISOString(),
		conferenceId,
		participants: users.flatMap((user) => {
			const kind =
				user.conferenceUserType === 'DELEGATE'
					? ('DELEGATE' as const)
					: user.conferenceUserType === 'NON_STATE_ACTOR'
						? ('NSA' as const)
						: undefined;
			if (!kind) return [];
			return [
				{
					email: user.userEmail,
					kind,
					committeeId: user.committeeMember?.committeeId ?? null,
					representation: representationOf(
						user.committeeMember?.representation ?? user.conferenceMember?.representation
					),
					events: user.presenceEvents.map((event) => ({
						id: event.id,
						committeeId: event.committeeId,
						present: event.present,
						type: event.type,
						timestamp: new Date(event.timestamp).toISOString()
					}))
				}
			];
		})
	};
}
