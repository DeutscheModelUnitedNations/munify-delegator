import { roleSeats } from '#lib/helpers/conferenceRole';
import { targetKey, type Target } from './state';

/** A role a delegation can be given, with the seats it brings. */
export interface SeatedRole {
	key: string;
	target: Target;
	seats: number;
}

/**
 * Every nation and non-state actor of a conference with its seats (`roleSeats`): the nations in the
 * order the committees seat them, then the non-state actors.
 */
export function seatedRoles({
	committees,
	nonStateActors
}: {
	committees: readonly { numOfSeatsPerDelegation: number; roles: readonly { id: string }[] }[];
	nonStateActors: readonly { id: string; seatAmount?: number | null }[];
}): SeatedRole[] {
	const nationIds = [
		...new Set(committees.flatMap((committee) => committee.roles.map((r) => r.id)))
	];
	const nations = nationIds.map((id) => ({
		target: { roleId: id },
		seats: roleSeats({ role: { id, kind: 'NATION', seatAmount: null }, committees })
	}));
	const nsas = nonStateActors.map((nsa) => ({
		target: { roleId: nsa.id },
		seats: nsa.seatAmount ?? 0
	}));
	return [...nations, ...nsas].map((role) => ({ key: targetKey(role.target) ?? '', ...role }));
}

/** Seats per role key. */
export function seatsByKey(roles: readonly SeatedRole[]) {
	return new Map(roles.map((role) => [role.key, role.seats]));
}
