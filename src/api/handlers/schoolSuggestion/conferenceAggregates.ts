/** Applied registrations of one school, as the organizers' school overview lists them. */
export type SchoolRow = {
	schoolId: string;
	school: string;
	delegationCount: number;
	delegationMembers: number;
	singleParticipants: number;
	sumParticipants: number;
};

type NamedSchool = { id: string; name: string } | null;

/**
 * Groups registrations by the school they named, in the order schools first appear (delegations
 * first). Registrations without a school are left out.
 */
export function schoolRows(
	delegations: { id: string; school: NamedSchool }[],
	members: { delegationId: string }[],
	singleParticipants: { school: NamedSchool }[]
): SchoolRow[] {
	const bySchool = new Map<string, SchoolRow>();
	const entryFor = (school: { id: string; name: string }) => {
		const existing = bySchool.get(school.id) ?? {
			schoolId: school.id,
			school: school.name,
			delegationCount: 0,
			delegationMembers: 0,
			singleParticipants: 0,
			sumParticipants: 0
		};
		bySchool.set(school.id, existing);
		return existing;
	};

	const membersOf = Map.groupBy(members, (member) => member.delegationId);
	for (const delegation of delegations) {
		if (!delegation.school) continue;
		const memberCount = membersOf.get(delegation.id)?.length ?? 0;
		const entry = entryFor(delegation.school);
		entry.delegationCount++;
		entry.delegationMembers += memberCount;
		entry.sumParticipants += memberCount;
	}

	for (const participant of singleParticipants) {
		if (!participant.school) continue;
		const entry = entryFor(participant.school);
		entry.singleParticipants++;
		entry.sumParticipants++;
	}

	return [...bySchool.values()];
}
