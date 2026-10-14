import { nationSeats } from '$lib/helpers/nationSeats';
import { targetKey, type Target } from './state';

/** A role a delegation can be given, with the seats it brings. */
export interface SeatedRole {
	key: string;
	target: Target;
	seats: number;
}

/**
 * Every nation and non-state actor of a conference with its seats: a nation's across the
 * committees it sits in, a non-state actor's own `seatAmount`.
 */
export function seatedRoles(
	committees: readonly {
		abbreviation: string;
		numOfSeatsPerDelegation: number;
		nations: readonly { alpha2Code: string; alpha3Code: string }[];
	}[],
	nonStateActors: readonly { id: string; seatAmount: number }[]
): SeatedRole[] {
	const nations = nationSeats(
		committees.map((committee) => ({ ...committee, nations: [...committee.nations] }))
	).map(({ nation, seats }) => {
		const target = { nationAlpha3Code: nation.alpha3Code, nonStateActorId: null };
		return { key: targetKey(target) ?? '', target, seats };
	});
	const nsas = nonStateActors.map((nsa) => {
		const target = { nationAlpha3Code: null, nonStateActorId: nsa.id };
		return { key: targetKey(target) ?? '', target, seats: nsa.seatAmount };
	});
	return [...nations, ...nsas];
}

/** Seats per role key. */
export function seatsByKey(roles: readonly SeatedRole[]) {
	return new Map(roles.map((role) => [role.key, role.seats]));
}
