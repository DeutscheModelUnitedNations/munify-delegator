/** The applied people of one school, as the organizers' school overview lists them. */
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
 * Groups people by their own school, in the order schools first appear (delegation members first).
 * A delegation counts for every school one of its members comes from. People without a school are
 * left out.
 */
export function schoolRows({
	members,
	singleParticipants
}: {
	members: { delegationId: string; school: NamedSchool }[];
	singleParticipants: { school: NamedSchool }[];
}): SchoolRow[] {
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

	const delegationsOf = new Map<string, Set<string>>();
	for (const member of members) {
		if (!member.school) continue;
		const entry = entryFor(member.school);
		entry.delegationMembers++;
		entry.sumParticipants++;
		const delegations = delegationsOf.get(member.school.id) ?? new Set();
		delegations.add(member.delegationId);
		delegationsOf.set(member.school.id, delegations);
		entry.delegationCount = delegations.size;
	}

	for (const participant of singleParticipants) {
		if (!participant.school) continue;
		const entry = entryFor(participant.school);
		entry.singleParticipants++;
		entry.sumParticipants++;
	}

	return [...bySchool.values()];
}
