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

/** The rows a school's counts come from, so a live overview can listen on them. */
export type SchoolRowSources = {
	schoolId: string;
	participantIds: string[];
	delegationIds: string[];
	singleParticipantIds: string[];
};

/** Which participants, delegations and single participants each school of `schoolRows` counts. */
export function schoolRowSources({
	members,
	singleParticipants
}: {
	members: { delegationId: string; participantId: string; school: NamedSchool }[];
	singleParticipants: { id: string; participantId: string; school: NamedSchool }[];
}): Map<string, SchoolRowSources> {
	const bySchool = new Map<string, SchoolRowSources>();
	const entryFor = (schoolId: string) => {
		const existing = bySchool.get(schoolId) ?? {
			schoolId,
			participantIds: [],
			delegationIds: [],
			singleParticipantIds: []
		};
		bySchool.set(schoolId, existing);
		return existing;
	};

	for (const member of members) {
		if (!member.school) continue;
		const entry = entryFor(member.school.id);
		entry.participantIds.push(member.participantId);
		if (!entry.delegationIds.includes(member.delegationId)) {
			entry.delegationIds.push(member.delegationId);
		}
	}
	for (const participant of singleParticipants) {
		if (!participant.school) continue;
		const entry = entryFor(participant.school.id);
		entry.participantIds.push(participant.participantId);
		entry.singleParticipantIds.push(participant.id);
	}
	return bySchool;
}
