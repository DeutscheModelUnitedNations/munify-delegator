/**
 * A `conference_role` row is a nation, a non-state actor or a custom role (see the table in
 * `src/api/db/schema/roles.ts`). The table cannot tell TypeScript which columns a kind fills, so
 * code that needs the kind's own fields narrows a row here once instead of checking nulls
 * everywhere.
 */

export type ConferenceRoleKind = 'NATION' | 'NON_STATE_ACTOR' | 'CUSTOM';

/** The role kinds a delegation can hold; a single participant holds a `CUSTOM` one. */
export const DELEGATION_ROLE_KINDS = ['NATION', 'NON_STATE_ACTOR'] as const;

/**
 * Splits a role into the nation or the non-state actor it is: exactly one of the two is set for a
 * delegation's role, neither for no role (or a custom one).
 */
export function splitRole<R extends { kind: ConferenceRoleKind; nation?: unknown }>(
	role: R | null | undefined
): { nation: NonNullable<R['nation']> | null; nonStateActor: R | null } {
	if (!role) return { nation: null, nonStateActor: null };
	return {
		nation: role.kind === 'NATION' ? (role.nation ?? null) : null,
		nonStateActor: role.kind === 'NON_STATE_ACTOR' ? role : null
	};
}

/** The parts of a committee that decide how many seats a nation holds there. */
interface SeatingCommittee {
	numOfSeatsPerDelegation: number;
	roles: readonly { id: string }[];
}

/**
 * How many people a role seats: a nation the seats of every committee it sits in, a non-state
 * actor or custom role its own `seatAmount`.
 */
export function roleSeats({
	role,
	committees
}: {
	role: { id: string; kind: ConferenceRoleKind; seatAmount: number | null };
	committees: readonly SeatingCommittee[];
}) {
	if (role.kind !== 'NATION') return role.seatAmount ?? 0;
	return committees
		.filter((committee) => committee.roles.some((seated) => seated.id === role.id))
		.reduce((total, committee) => total + committee.numOfSeatsPerDelegation, 0);
}
