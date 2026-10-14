/**
 * The supervisors of all given registrations, each once (the same person can supervise both
 * kinds), sorted by family name.
 */
export function uniqueSupervisorsByFamilyName<
	S extends { id: string; user: { familyName: string | null } }
>(...lists: (readonly S[] | undefined)[]) {
	const byId = new Map<string, S>();
	for (const supervisor of lists.flatMap((list) => list ?? [])) {
		byId.set(supervisor.id, supervisor);
	}
	return [...byId.values()].sort((a, b) =>
		(a.user.familyName ?? '').localeCompare(b.user.familyName ?? '')
	);
}
