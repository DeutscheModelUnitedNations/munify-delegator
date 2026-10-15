/** Applied registrations of one school, as the organizers' school overview lists them. */
export type SchoolRow = {
	school: string;
	delegationCount: number;
	delegationMembers: number;
	singleParticipants: number;
	sumParticipants: number;
};

/**
 * Groups registrations by the school they named, in the order schools first appear (delegations
 * first). Registrations without a school are left out.
 */
export function schoolRows(
	delegations: { id: string; school: string | null }[],
	members: { delegationId: string }[],
	singleParticipants: { school: string | null }[]
): SchoolRow[] {
	const bySchool = new Map<string, SchoolRow>();
	const entryFor = (school: string) => {
		const existing = bySchool.get(school) ?? {
			school,
			delegationCount: 0,
			delegationMembers: 0,
			singleParticipants: 0,
			sumParticipants: 0
		};
		bySchool.set(school, existing);
		return existing;
	};

	for (const delegation of delegations) {
		if (!delegation.school) continue;
		const memberCount = members.filter((member) => member.delegationId === delegation.id).length;
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

/**
 * Cleans a hand-typed school name: commas and periods become spaces, runs of whitespace
 * collapse and the ends are trimmed.
 */
export function normalizeSchoolName(name: string) {
	return name.replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();
}
