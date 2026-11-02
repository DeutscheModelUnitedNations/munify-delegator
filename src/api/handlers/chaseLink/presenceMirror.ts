import { CHASE_PRESENCE_SCHEMA_URL, type ChasePresence } from '#lib/schemata/chasePresence';

/**
 * CHASE's presence records of one conference, in the shape of CHASE's presence export
 * (`chasePresenceSchema`), so the attendance import page scores them like an uploaded file. Only
 * delegates and non-state actors have presence; the rest of the conference is left out.
 */

interface ChaseRepresentation {
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
