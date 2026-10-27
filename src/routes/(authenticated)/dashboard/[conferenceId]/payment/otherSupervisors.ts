interface Student {
	supervisors: { id: string }[];
}

/**
 * The other supervisors of the caller's students, in the order they are first met (delegation
 * members first), so a group payment can name the ones it covers. Only the supervisors in
 * `candidates` are known by user; the caller is left out.
 */
export function findOtherSupervisors<U extends { id: string }>(
	me:
		| {
				user: { id: string };
				supervisedDelegationMembers: Student[];
				supervisedSingleParticipants: Student[];
		  }
		| undefined,
	candidates: { id: string; user: U }[]
): U[] {
	if (!me) return [];
	const students = [...me.supervisedDelegationMembers, ...me.supervisedSingleParticipants];
	const presentSupervisorIds = new Set(
		students.flatMap((student) => student.supervisors.map((sup) => sup.id))
	);
	return [...presentSupervisorIds]
		.map((id) => candidates.find((sup) => sup.id === id)?.user)
		.filter((user): user is U => !!user && user.id !== me.user.id);
}
