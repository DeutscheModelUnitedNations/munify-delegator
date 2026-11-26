/**
 * The id of the function a member holds as `kind`, in `committeeId` or for `roleId` (both empty for
 * a trusted person); undefined while they do not hold it.
 */
export function heldFunctionId({
	functions,
	kind,
	committeeId,
	roleId = null
}: {
	functions: readonly {
		id: string;
		kind: string;
		committeeId?: string | null;
		roleId?: string | null;
	}[];
	kind: string;
	committeeId: string | null;
	roleId?: string | null;
}) {
	return functions.find(
		(held) =>
			held.kind === kind &&
			(held.committeeId ?? null) === committeeId &&
			(held.roleId ?? null) === roleId
	)?.id;
}
