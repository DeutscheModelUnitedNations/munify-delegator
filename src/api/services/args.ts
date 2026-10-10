/**
 * An optional GraphQL argument as a value for a drizzle `set`: an omitted argument and an explicit
 * `null` both become `undefined`, which leaves the column alone. For non-nullable columns, where a
 * `null` cannot be written anyway.
 */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
	return value ?? undefined;
}

/** How many of the given optional arguments were supplied, counting only truthy ones. */
export function countGiven(...values: unknown[]): number {
	return values.filter(Boolean).length;
}

/**
 * The filters matching a delegation assigned to the given nation or non-state actor, for an `OR`:
 * one per role that is given.
 */
export function assignedRoleConditions(role: {
	assignedNationAlpha3Code?: string | null;
	assignedNonStateActorId?: string | null;
}) {
	return [
		...(role.assignedNationAlpha3Code
			? [{ assignedNationAlpha3Code: role.assignedNationAlpha3Code }]
			: []),
		...(role.assignedNonStateActorId
			? [{ assignedNonStateActorId: role.assignedNonStateActorId }]
			: [])
	];
}
