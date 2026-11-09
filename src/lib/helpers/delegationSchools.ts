type NamedSchool = { name: string } | null | undefined;

/** Each school once, the most common first (then by name); `key` says which are the same. */
function distinctBy<S extends { name: string }>({
	schools,
	key
}: {
	schools: readonly (S | null | undefined)[];
	key: (school: S) => string;
}) {
	const counts = new Map<string, { school: S; count: number }>();
	for (const school of schools) {
		if (!school) continue;
		const seen = counts.get(key(school));
		counts.set(key(school), { school, count: (seen?.count ?? 0) + 1 });
	}
	return [...counts.values()]
		.toSorted((a, b) => b.count - a.count || a.school.name.localeCompare(b.school.name))
		.map(({ school }) => school);
}

/**
 * The schools of a delegation, which keeps none of its own: its members' own schools, each named
 * once, the most common first (then by name). Members without a school are left out.
 */
export function distinctSchoolNames(schools: readonly NamedSchool[]) {
	return distinctBy({ schools, key: (school) => school.name }).map((school) => school.name);
}

/** Like `distinctSchoolNames`, but the schools themselves, for linking to them. */
export function distinctSchools<S extends { id: string; name: string }>(
	schools: readonly (S | null | undefined)[]
) {
	return distinctBy({ schools, key: (school) => school.id });
}

/** The members' schools as one line, for a card or a table cell; null when none has one. */
export function delegationSchoolsLabel(members: readonly { school?: NamedSchool }[]) {
	const names = distinctSchoolNames(members.map((member) => member.school));
	return names.length > 0 ? names.join(', ') : null;
}
