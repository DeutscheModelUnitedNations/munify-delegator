interface GroupableResolution {
	committee: { id: string; name: string; abbreviation: string } | null;
}

export interface ResolutionGroup<T> {
	key: string;
	/** `null` for resolutions without a committee tag. */
	committeeName: string | null;
	items: T[];
}

/**
 * Groups resolutions by committee for display. Committees keep the order in which
 * they first appear; resolutions without a committee tag are collected in a
 * "general" group that is always last.
 */
export function groupResolutionsByCommittee<T extends GroupableResolution>(
	resolutions: readonly T[] | null | undefined
): ResolutionGroup<T>[] {
	const groups = new Map<string, ResolutionGroup<T>>();
	for (const resolution of resolutions ?? []) {
		const committee = resolution.committee;
		const key = committee?.id ?? '__none__';
		let group = groups.get(key);
		if (!group) {
			group = {
				key,
				committeeName: committee ? `${committee.name} (${committee.abbreviation})` : null,
				items: []
			};
			groups.set(key, group);
		}
		group.items.push(resolution);
	}
	// Array.prototype.sort is stable, so committees keep their relative order.
	return [...groups.values()].sort(
		(a, b) => Number(a.committeeName === null) - Number(b.committeeName === null)
	);
}
