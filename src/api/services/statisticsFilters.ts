/** How the statistics dashboard narrows a conference down to a subset of its registrations. */
export type StatsFilterType =
	'ALL' | 'APPLIED' | 'NOT_APPLIED' | 'APPLIED_WITH_ROLE' | 'APPLIED_WITHOUT_ROLE';

/**
 * The two dimensions every statistics view is grouped by. A delegation member takes them from its
 * delegation, where a nation or a non-state actor counts as a role; a supervisor from the people
 * they supervise (see the `statistics_participation` view).
 */
export interface FilterDimensions {
	applied: boolean;
	hasRole: boolean;
}

/** Whether a row of a statistics view belongs to the registrations the filter selects. */
export function matchesStatsFilter(filter: StatsFilterType, row: FilterDimensions) {
	switch (filter) {
		case 'ALL':
			return true;
		case 'APPLIED':
			return row.applied;
		case 'NOT_APPLIED':
			return !row.applied;
		case 'APPLIED_WITH_ROLE':
			return row.applied && row.hasRole;
		case 'APPLIED_WITHOUT_ROLE':
			return row.applied && !row.hasRole;
	}
}
