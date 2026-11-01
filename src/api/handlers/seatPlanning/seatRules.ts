import { m } from '#lib/paraglide/messages';
import formatNames from '#lib/helpers/formatNames';
import { z } from 'zod';

/**
 * The seat planning's rules shared by the committee and the role handlers, free of
 * database access so they are unit tested.
 */

/** How many seats a committee gives each delegation, or a non-state actor has: at least one. */
export const seatCountSchema = z.number().min(1, { error: () => m.seatsPerDelegationAtLeastOne() });

interface DelegationWithMembers {
	/** Set when the delegation holds a nation. */
	nationAlpha3Code: string | null;
	members: {
		assignedCommitteeId: string | null;
		user: { givenName: string; familyName: string };
	}[];
}

/**
 * Committee seats that cannot be removed because members of the delegation holding the nation are
 * assigned to that committee, with the names of those members.
 */
export function lockedCommitteeSeats(delegations: DelegationWithMembers[]) {
	return delegations.flatMap(({ nationAlpha3Code, members }) => {
		if (!nationAlpha3Code) return [];

		const namesByCommittee = new Map<string, string[]>();
		for (const { assignedCommitteeId, user } of members) {
			if (!assignedCommitteeId) continue;
			const names = namesByCommittee.get(assignedCommitteeId) ?? [];
			names.push(formatNames({ givenName: user.givenName, familyName: user.familyName }));
			namesByCommittee.set(assignedCommitteeId, names);
		}

		return [...namesByCommittee].map(([committeeId, memberNames]) => ({
			committeeId,
			nationAlpha3Code,
			memberNames
		}));
	});
}
