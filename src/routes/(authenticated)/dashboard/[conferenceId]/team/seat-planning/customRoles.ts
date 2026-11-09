/** A role for single participants - the press, a chair, … - and how many hold it. */
export interface CustomRole {
	id: string;
	name: string;
	description: string;
	icon: string | null;
	seatAmount: number;
	holders: number;
}

/** A custom role as the table shows it, its unset fields filled in. */
export function customRoleRow(role: {
	id: string;
	name?: string | null;
	description?: string | null;
	icon?: string | null;
	seatAmount?: number | null;
	assignedSingleParticipants: readonly unknown[];
}): CustomRole {
	return {
		id: role.id,
		name: role.name ?? '',
		description: role.description ?? '',
		icon: role.icon ?? null,
		seatAmount: role.seatAmount ?? 0,
		holders: role.assignedSingleParticipants.length
	};
}

/** A trimmed text field, or undefined when it is empty - which the mutations take as "none". */
export const optionalText = (text: string) => text.trim() || undefined;
