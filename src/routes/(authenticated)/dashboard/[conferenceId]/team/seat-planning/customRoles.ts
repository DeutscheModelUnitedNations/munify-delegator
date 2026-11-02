/** A role for single participants - the press, a chair, … - and how many hold it. */
export interface CustomRole {
	id: string;
	name: string;
	description: string;
	fontAwesomeIcon: string | null;
	seatAmount: number;
	holders: number;
	/** What its people are in a linked CHASE. */
	chaseAccess: ChaseAccess;
}

export type ChaseAccess = 'SPECTATOR' | 'TEAM' | 'NONE';

/** A custom role as the table shows it, its unset fields filled in. */
export function customRoleRow(role: {
	id: string;
	name?: string | null;
	description?: string | null;
	fontAwesomeIcon?: string | null;
	seatAmount?: number | null;
	chaseAccess: ChaseAccess;
	assignedSingleParticipants: readonly unknown[];
}): CustomRole {
	return {
		id: role.id,
		name: role.name ?? '',
		description: role.description ?? '',
		fontAwesomeIcon: role.fontAwesomeIcon ?? null,
		seatAmount: role.seatAmount ?? 0,
		holders: role.assignedSingleParticipants.length,
		chaseAccess: role.chaseAccess
	};
}

/** A trimmed text field, or undefined when it is empty - which the mutations take as "none". */
export const optionalText = (text: string) => text.trim() || undefined;
