/** The registration-status filters and the role-based filters of the statistics page. */
export type StatsFilterOption =
	'all' | 'applied' | 'notApplied' | 'appliedWithRole' | 'appliedWithoutRole';

export interface FilterableCount {
	total: number;
	notApplied: number;
	applied: number;
}

/** The role counts the role based filters pick from. */
export interface RoleCounts {
	delegationMembersWithRole: number;
	delegationMembersWithoutRole: number;
	singleParticipantsWithRole: number;
	singleParticipantsWithoutRole: number;
}

/** Entity types for role-based filtering; `total` (or none) sums both. */
export type EntityType = 'delegationMembers' | 'singleParticipants' | 'total';

type RoleFilter = Extract<StatsFilterOption, 'appliedWithRole' | 'appliedWithoutRole'>;
type CountFilter = Exclude<StatsFilterOption, RoleFilter>;
type RoleCountKeys = Record<Exclude<EntityType, 'total'>, keyof RoleCounts>;

const countKeys: Record<CountFilter, keyof FilterableCount> = {
	all: 'total',
	applied: 'applied',
	notApplied: 'notApplied'
};

const roleCountKeys: Record<RoleFilter, RoleCountKeys> = {
	appliedWithRole: {
		delegationMembers: 'delegationMembersWithRole',
		singleParticipants: 'singleParticipantsWithRole'
	},
	appliedWithoutRole: {
		delegationMembers: 'delegationMembersWithoutRole',
		singleParticipants: 'singleParticipantsWithoutRole'
	}
};

function isRoleFilter(filter: StatsFilterOption): filter is RoleFilter {
	return filter in roleCountKeys;
}

function roleBasedValue(
	keys: RoleCountKeys,
	roleBasedData: RoleCounts | undefined,
	entityType: EntityType | undefined
): number | undefined {
	if (!roleBasedData) return undefined;
	if (entityType === 'delegationMembers' || entityType === 'singleParticipants') {
		return roleBasedData[keys[entityType]];
	}
	return roleBasedData[keys.delegationMembers] + roleBasedData[keys.singleParticipants];
}

/**
 * The number a widget shows under the given filter. Status filters pick from the count object,
 * role-based filters from the role counts, for one entity type or both combined.
 */
export function filteredStatValue(
	filter: StatsFilterOption,
	object: FilterableCount | undefined,
	roleBasedData?: RoleCounts,
	entityType?: EntityType
): number | undefined {
	if (!object) return undefined;
	if (isRoleFilter(filter)) return roleBasedValue(roleCountKeys[filter], roleBasedData, entityType);
	return object[countKeys[filter]];
}
