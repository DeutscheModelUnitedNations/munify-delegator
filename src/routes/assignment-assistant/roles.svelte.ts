export enum RoleCategory {
	DELEGATON,
	SINGLE
}

interface Role {
	id: string;
}

export interface DelegationRole extends Role {
	numOfSeats: number;
	category: RoleCategory.DELEGATON;
}

export interface SingleRole extends Role {
	category: RoleCategory.SINGLE;
}
