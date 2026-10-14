import { m } from '$lib/paraglide/messages';
import type { EntityType, FilterableCount, RoleCounts } from '../statsFilterValue';

type Maybe<T> = T | null | undefined;

const categoryColors = new Map([
	['nationDelegates', '#3b82f6'], // blue
	['nsaParticipants', '#8b5cf6'], // violet
	['unassignedDelegationMembers', '#6b7280'] // gray
]);

/** Colors for roles (single participants), picked by the role's index. */
const roleColors = ['#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

/** A category's fixed color, or for a role the color at its index. */
export function getCategoryColor(categoryId: string, index: number): string {
	return categoryColors.get(categoryId) ?? roleColors[index % roleColors.length];
}

const categoryNames = new Map<string, () => string>([
	['nationDelegates', m.statsNationDelegates],
	['nsaParticipants', m.statsNSAParticipants],
	['unassignedDelegationMembers', m.statsUnassignedDelegationMembers],
	['unassigned', m.statsUnassigned]
]);

/** The translated name of a fixed category; roles keep their own name. */
export function getCategoryDisplayName(categoryId: string, categoryName: string): string {
	return categoryNames.get(categoryId)?.() ?? categoryName;
}

interface AgeStats {
	distribution?: Maybe<readonly { byCategory: readonly { categoryId: string; count: number }[] }[]>;
	byCategory?: Maybe<readonly { categoryId: string; categoryName: string; categoryType: string }[]>;
}

/** One stacked series per category, counting its people at every age of the distribution. */
export function ageChartSeries(age: Maybe<AgeStats>) {
	const distribution = age?.distribution ?? [];
	if (distribution.length === 0) return [];
	let roleIndex = 0;
	return (age?.byCategory ?? []).map((category) => {
		const colorIndex = category.categoryType === 'singleParticipant' ? roleIndex++ : 0;
		return {
			name: getCategoryDisplayName(category.categoryId, category.categoryName),
			data: distribution.map(
				(d) => d.byCategory.find((c) => c.categoryId === category.categoryId)?.count ?? 0
			),
			color: getCategoryColor(category.categoryId, colorIndex)
		};
	});
}

/** Everyone who got a seat or role. */
export const acceptedOf = (roleBased: RoleCounts) =>
	roleBased.delegationMembersWithRole + roleBased.singleParticipantsWithRole;

/** Everyone who applied but got no seat or role. */
export const rejectedOf = (roleBased: RoleCounts) =>
	roleBased.delegationMembersWithoutRole + roleBased.singleParticipantsWithoutRole;

/** Accepted, rejected and not applied, for the stacked bar of the registration widget. */
export function acceptanceChartData(
	stats: Maybe<{ registered?: Maybe<{ notApplied: number }>; roleBased?: Maybe<RoleCounts> }>
) {
	const registered = stats?.registered;
	const roleBased = stats?.roleBased;
	if (!registered || !roleBased) return [];
	return [
		{ name: m.statsFilterAccepted(), value: acceptedOf(roleBased), color: '#10b981' }, // emerald/success
		{ name: m.statsFilterRejected(), value: rejectedOf(roleBased), color: '#f59e0b' }, // amber/warning
		{ name: m.registrationNotApplied(), value: registered.notApplied, color: '#6b7280' } // gray
	];
}

type FilteredValue = (
	object: FilterableCount | undefined,
	roleBasedData?: RoleCounts,
	entityType?: EntityType
) => number | undefined;

/** Delegation members, single participants and supervisors under the current filter. */
export function distributionChartData(
	stats: Maybe<{
		registered?: Maybe<{
			delegationMembers: FilterableCount;
			singleParticipants: FilterableCount;
			supervisors: number;
		}>;
		roleBased?: Maybe<RoleCounts>;
	}>,
	filteredValue: FilteredValue
) {
	const registered = stats?.registered;
	if (!registered) return [];
	const roleBased = stats?.roleBased ?? undefined;
	const count = (object: FilterableCount, entityType: EntityType) =>
		filteredValue(object, roleBased, entityType) ?? 0;
	return [
		{
			name: m.delegationMembers(),
			value: count(registered.delegationMembers, 'delegationMembers'),
			color: '#3b82f6' // blue/primary
		},
		{
			name: m.singleParticipants(),
			value: count(registered.singleParticipants, 'singleParticipants'),
			color: '#8b5cf6' // violet/secondary
		},
		{ name: m.supervisors(), value: registered.supervisors, color: '#f59e0b' } // amber/accent
	];
}
