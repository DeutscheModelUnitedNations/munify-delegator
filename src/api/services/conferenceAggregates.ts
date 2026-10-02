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
 * The alpha-3 codes of every nation seated in any of the committees, each once. A nation can sit
 * in several committees; it is deduplicated by alpha-2 code, matching the legacy behaviour.
 */
export function distinctNationCodes(
	committees: { nations: { alpha2Code: string; alpha3Code: string }[] }[]
): string[] {
	const seen = new Set<string>();
	const alpha3Codes: string[] = [];
	for (const nation of committees.flatMap((committee) => committee.nations)) {
		if (seen.has(nation.alpha2Code)) continue;
		seen.add(nation.alpha2Code);
		alpha3Codes.push(nation.alpha3Code);
	}
	return alpha3Codes;
}
