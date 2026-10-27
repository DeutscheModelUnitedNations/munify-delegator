type NamedSchool = { name: string } | null | undefined;

/**
 * The schools of a delegation, which keeps none of its own: its members' own schools, each named
 * once, the most common first (then by name). Members without a school are left out.
 */
export function distinctSchoolNames(schools: readonly NamedSchool[]) {
	const counts = new Map<string, number>();
	for (const school of schools) {
		if (school) counts.set(school.name, (counts.get(school.name) ?? 0) + 1);
	}
	return [...counts]
		.toSorted(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
		.map(([name]) => name);
}

/** The members' schools as one line, for a card or a table cell; null when none has one. */
export function delegationSchoolsLabel(members: readonly { school?: NamedSchool }[]) {
	const names = distinctSchoolNames(members.map((member) => member.school));
	return names.length > 0 ? names.join(', ') : null;
}
