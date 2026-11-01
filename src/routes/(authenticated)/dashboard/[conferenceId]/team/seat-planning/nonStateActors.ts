/** A non-state actor - an NGO, a company, … - as the seat planning shows it. */
export interface NonStateActor {
	id: string;
	name: string;
	abbreviation: string;
	description: string;
	fontAwesomeIcon: string | null;
	seatAmount: number;
}

/**
 * A non-state actor's role as the table shows it. Such a role always fills these columns; the
 * shared role type cannot say so, so unset ones read as empty.
 */
export function nonStateActorRow(role: {
	id: string;
	name?: string | null;
	abbreviation?: string | null;
	description?: string | null;
	fontAwesomeIcon?: string | null;
	seatAmount?: number | null;
}): NonStateActor {
	return {
		id: role.id,
		name: role.name ?? '',
		abbreviation: role.abbreviation ?? '',
		description: role.description ?? '',
		fontAwesomeIcon: role.fontAwesomeIcon ?? null,
		seatAmount: role.seatAmount ?? 0
	};
}
