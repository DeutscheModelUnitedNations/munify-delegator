import { roleSeats, type ConferenceRoleKind } from '#lib/helpers/conferenceRole';
import {
	type FilterDimensions,
	type StatsFilterType,
	matchesStatsFilter
} from './statisticsFilters';

/**
 * How popular each nation and non-state actor is among the delegations' wishes
 * (`statistics_role_popularity`): how many delegations named it, at which rank, and a weighted
 * popularity that lets a first wish count more than a later one.
 */

/**
 * What a wish at `rank` (1 is the first wish) adds to a role's weighted popularity: 1 / rank, so a
 * first wish counts 1, a second 0.5, a third ⅓. Ranks below 1 never reach the database outside a
 * running swap and count nothing.
 */
export function rankWeight(rank: number) {
	return rank >= 1 ? 1 / rank : 0;
}

/** The sum of `rankWeight` over a role's wishes, `count` wishes at each rank. */
export function weightedPopularity(wishes: readonly { rank: number; count: number }[]) {
	return wishes.reduce((sum, wish) => sum + wish.count * rankWeight(wish.rank), 0);
}

/** The view's rows: delegations wishing for a role at one rank, in one filter dimension. */
export interface RoleWishRow extends FilterDimensions {
	roleId: string;
	rank: number;
	count: number;
}

/** A nation or non-state actor of the conference, as `roleSeats` needs it. */
export interface PopularityRole {
	id: string;
	kind: ConferenceRoleKind;
	seatAmount: number | null;
}

/** Wishes per rank and in total, of the delegations the filter selects. */
export function wishCountsOf({
	wishes,
	filter
}: {
	wishes: readonly RoleWishRow[];
	filter: StatsFilterType;
}) {
	const selected = wishes.filter((row) => matchesStatsFilter({ filter, row }));
	const atRank = (predicate: (rank: number) => boolean) =>
		selected.reduce((sum, row) => (predicate(row.rank) ? sum + row.count : sum), 0);
	return {
		applications: atRank((rank) => rank >= 1),
		firstChoice: atRank((rank) => rank === 1),
		secondChoice: atRank((rank) => rank === 2),
		thirdChoice: atRank((rank) => rank === 3),
		laterChoice: atRank((rank) => rank > 3),
		weightedPopularity: weightedPopularity(selected)
	};
}

/**
 * Every role with its seats (`roleSeats`) and the wishes for it of the delegations the filter
 * selects; a role nobody wished for gets zeros. Sorted by seats, then least popular first.
 */
export function rolePopularityOf<R extends PopularityRole>({
	roles,
	committees,
	wishes,
	filter
}: {
	roles: readonly R[];
	committees: Parameters<typeof roleSeats>[0]['committees'];
	wishes: readonly RoleWishRow[];
	filter: StatsFilterType;
}) {
	const wishesByRole = Map.groupBy(wishes, (row) => row.roleId);
	return roles
		.map((role) => ({
			role,
			seats: roleSeats({ role, committees }),
			...wishCountsOf({ wishes: wishesByRole.get(role.id) ?? [], filter })
		}))
		.toSorted((a, b) => a.seats - b.seats || a.weightedPopularity - b.weightedPopularity);
}
