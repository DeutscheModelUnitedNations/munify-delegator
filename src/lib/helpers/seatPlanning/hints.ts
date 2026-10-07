import { regionalGroups, type RegionalGroup, type UnMember } from './unMembers';

/**
 * Pure functions behind the hints sidebar of the seat planning tool.
 *
 * A "role" is something a delegation can be assigned to: a nation holding at least one seat or a
 * non-state actor. Its size is its number of seats, i.e. the delegation size it fits.
 */

export interface PlanningCommittee {
	id: string;
	numOfSeatsPerDelegation: number;
	/** lowercase alpha-3 codes of the nations holding a seat */
	nations: string[];
}

export interface PlanningNonStateActor {
	id: string;
	seatAmount: number;
}

export interface Role {
	kind: 'nation' | 'nsa';
	/** lowercase alpha-3 code for nations, the id for non-state actors */
	id: string;
	size: number;
}

/** Seats per nation: the sum of `numOfSeatsPerDelegation` over the committees containing it */
export function nationSeatCounts(committees: PlanningCommittee[]) {
	const counts = new Map<string, number>();
	for (const committee of committees) {
		for (const nation of committee.nations) {
			counts.set(nation, (counts.get(nation) ?? 0) + committee.numOfSeatsPerDelegation);
		}
	}
	return counts;
}

export function rolesOf(seatCounts: Map<string, number>, nonStateActors: PlanningNonStateActor[]) {
	const nations: Role[] = [...seatCounts]
		.filter(([, size]) => size > 0)
		.map(([id, size]) => ({ kind: 'nation', id, size }));
	const nsas: Role[] = nonStateActors.map(({ id, seatAmount }) => ({
		kind: 'nsa',
		id,
		size: seatAmount
	}));
	return [...nations, ...nsas];
}

/** Number of roles per size, ascending by size */
export function sizeHistogram(roles: Role[]) {
	const counts = new Map<number, number>();
	for (const { size } of roles) {
		counts.set(size, (counts.get(size) ?? 0) + 1);
	}
	return [...counts].map(([size, count]) => ({ size, count })).sort((a, b) => a.size - b.size);
}

/** Seats per committee in the given order, with the committee's name and abbreviation */
export function committeeSeatTotals(
	committees: PlanningCommittee[],
	info: { id: string; name: string; abbreviation: string }[]
) {
	const infoById = new Map(info.map((committee) => [committee.id, committee]));
	return committees.map(({ id, nations, numOfSeatsPerDelegation }) => ({
		id,
		name: infoById.get(id)?.name ?? '',
		abbreviation: infoById.get(id)?.abbreviation ?? '',
		nations: nations.length,
		seatsPerDelegation: numOfSeatsPerDelegation,
		seats: nations.length * numOfSeatsPerDelegation
	}));
}

/**
 * Every delegation should be able to choose between at least `minRoles` roles of exactly its size.
 * Warns about every occurring size with fewer roles and suggests nations one seat away from it.
 */
export function exactSizeWarnings(roles: Role[], minRoles = 3) {
	return sizeHistogram(roles)
		.filter(({ count }) => count < minRoles)
		.map(({ size, count }) => ({
			size,
			count,
			candidates: roles.filter((role) => role.kind === 'nation' && Math.abs(role.size - size) === 1)
		}));
}

/** Roles with a single seat are impractical: a delegation needs at least two people */
export function singleSeatRoles(roles: Role[]) {
	return roles.filter((role) => role.size === 1);
}

export interface SizeLimits {
	min: number | null;
	max: number | null;
}

/** Whether a role of this size violates the limits; unseated nations (size 0) never do */
export function isOutsideSizeLimits(size: number, { min, max }: SizeLimits) {
	if (size === 0) return false;
	return (min !== null && size < min) || (max !== null && size > max);
}

/** Per regional group: how many of its members hold at least one seat */
export function seatedByGroup(members: UnMember[], seatCounts: Map<string, number>) {
	return regionalGroups.map((group) => {
		const groupMembers = members.filter((member) => member.regionalGroup === group);
		const seated = groupMembers.filter((member) => (seatCounts.get(member.alpha3Code) ?? 0) > 0);
		return {
			group,
			total: groupMembers.length,
			seated: seated.length,
			unseated: groupMembers.length - seated.length
		};
	});
}

const parseLimit = (value: unknown) =>
	typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;

/** Size limits from untrusted input (browser storage, form fields); invalid values mean no limit */
export function parseSizeLimits(value: unknown): SizeLimits {
	if (!value || typeof value !== 'object') return { min: null, max: null };
	return {
		min: parseLimit('min' in value ? value.min : null),
		max: parseLimit('max' in value ? value.max : null)
	};
}

export interface SeatFilters {
	q: string | null;
	group: string | null;
	noSeat: boolean | null;
	size: number | null;
}

interface FilterableRow {
	name: string;
	alpha2Code: string;
	alpha3Code: string;
	regionalGroup: RegionalGroup;
}

/** Whether a row of the states matrix passes the filters; `size` is its current seat count */
export function matchesSeatFilters(row: FilterableRow, size: number, filters: SeatFilters) {
	const search = filters.q?.trim().toLowerCase();
	const matchesSearch =
		!search ||
		row.name.toLowerCase().includes(search) ||
		[row.alpha2Code, row.alpha3Code].includes(search);
	return (
		matchesSearch &&
		(!filters.group || row.regionalGroup === filters.group) &&
		(!filters.noSeat || size === 0) &&
		(filters.size === null || size === filters.size)
	);
}

interface AssignedRole {
	nationAlpha3Code: string | null;
	nonStateActorId: string | null;
	memberCount: number;
}

/** Members of the delegation assigned to each nation and NSA */
export function assignedMemberCounts(roles: AssignedRole[]) {
	const nations = new Map<string, number>();
	const nonStateActors = new Map<string, number>();
	for (const { nationAlpha3Code, nonStateActorId, memberCount } of roles) {
		if (nationAlpha3Code) nations.set(nationAlpha3Code, memberCount);
		if (nonStateActorId) nonStateActors.set(nonStateActorId, memberCount);
	}
	return { nations, nonStateActors };
}

export interface PendingSeat {
	committeeId: string;
	nationAlpha3Code: string;
	enabled: boolean;
}

/** Nations per committee as saved, with the not yet confirmed changes applied on top */
export function seatsWithPending(
	committees: { id: string; nations: { alpha3Code: string }[] }[],
	pending: PendingSeat[]
) {
	const seats = new Map(
		committees.map((committee) => [
			committee.id,
			new Set(committee.nations.map((nation) => nation.alpha3Code))
		])
	);
	for (const { committeeId, nationAlpha3Code, enabled } of pending) {
		const nations = seats.get(committeeId);
		if (enabled) nations?.add(nationAlpha3Code);
		else nations?.delete(nationAlpha3Code);
	}
	return seats;
}
