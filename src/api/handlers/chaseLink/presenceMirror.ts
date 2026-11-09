import { CHASE_PRESENCE_SCHEMA_URL, type ChasePresence } from '#lib/schemata/chasePresence';
import { apiError } from '#api/services/errors';
import { logger } from '#lib/logger';
import { m } from '#lib/paraglide/messages';
import { createChaseClient } from './chaseRemote';
import { linkAccessToken, linkConfig } from './linkAuth';

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
	icon?: string | null;
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
		icon: representation.icon ?? null,
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
					events: user.presenceEvents
						.toSorted((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
						.map((event) => ({
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

/** CHASE answers lists in pages; the people of a conference fit in a few. */
const PAGE_SIZE = 1000;

const REPRESENTATION = {
	type: true,
	alpha2Code: true,
	alpha3Code: true,
	icon: true,
	name: true
} as const;

/**
 * What the linked CHASE recorded about a conference's presence right now, asked of it through its
 * own queries of the people, their seats and presence events: nothing of it is kept here. Undefined
 * while no CHASE is linked; an unreachable CHASE is an error the page shows.
 */
export async function fetchChasePresence({ conferenceId }: { conferenceId: string }) {
	const config = linkConfig();
	if (!config) return undefined;
	const remote = createChaseClient({
		url: config.remoteUrl,
		token: () => linkAccessToken(config)
	});
	try {
		const users: ChasePresenceUser[] = [];
		for (let offset = 0; ; offset += PAGE_SIZE) {
			const page = await remote.query.conferenceUsers({
				__args: {
					where: { conferenceId: { eq: conferenceId } },
					orderBy: { id: 'asc' },
					limit: PAGE_SIZE,
					offset
				},
				conferenceUserType: true,
				userEmail: true,
				committeeMember: { committeeId: true, representation: REPRESENTATION },
				conferenceMember: { representation: REPRESENTATION },
				presenceEvents: { committeeId: true, present: true, type: true, timestamp: true }
			});
			users.push(...page);
			if (page.length < PAGE_SIZE) break;
		}
		return presenceFromChase({ conferenceId, users, now: new Date() });
	} catch (error) {
		logger.warn('Reading the presence from CHASE failed', { error, conferenceId });
		throw apiError({ code: 'CONFLICT', message: m.importPresenceFromChaseFailed() });
	} finally {
		remote.dispose();
	}
}
