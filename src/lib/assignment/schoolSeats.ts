import { targetKey, type AssignmentGroup } from './state';

/**
 * How many seats the assignment as planned gives each school, for the per-school seat limit
 * (`conference.maxSeatsPerSchool`). The limit only warns: the team may decide to go past it.
 */

export interface SeatSchool {
	id: string;
	name: string;
}

export interface SchoolSeatCount {
	schoolId: string;
	name: string;
	seats: number;
}

/** The school of an application, if it named one. */
export type SchoolLookup = (id: string) => SeatSchool | null | undefined;

/** The school a group of the board comes from: its delegation's, or the converted single's. */
export function schoolOfGroup(
	group: Pick<AssignmentGroup, 'delegationId' | 'singleParticipantId'>,
	schoolOfDelegation: SchoolLookup,
	schoolOfSingle: SchoolLookup
) {
	if (group.delegationId) return schoolOfDelegation(group.delegationId) ?? undefined;
	if (group.singleParticipantId) return schoolOfSingle(group.singleParticipantId) ?? undefined;
	return undefined;
}

/**
 * Seats per school in the plan: every group holding a role counts its size, every single
 * participant holding a custom role one. Most seats first; applications without a school are left
 * out.
 */
export function schoolSeats(
	view: {
		groups: readonly AssignmentGroup[];
		singles: readonly { singleParticipantId: string; roleId: string | null }[];
	},
	schoolOfDelegation: SchoolLookup,
	schoolOfSingle: SchoolLookup
): SchoolSeatCount[] {
	const counts = new Map<string, SchoolSeatCount>();
	const add = (school: SeatSchool | undefined, seats: number) => {
		if (!school) return;
		const entry = counts.get(school.id) ?? { schoolId: school.id, name: school.name, seats: 0 };
		entry.seats += seats;
		counts.set(school.id, entry);
	};
	for (const group of view.groups) {
		if (!targetKey(group.target)) continue;
		add(schoolOfGroup(group, schoolOfDelegation, schoolOfSingle), group.size);
	}
	for (const single of view.singles) {
		if (single.roleId) add(schoolOfSingle(single.singleParticipantId) ?? undefined, 1);
	}
	return [...counts.values()].sort((a, b) => b.seats - a.seats || a.name.localeCompare(b.name));
}

/** The schools past the limit; none without one. */
export function schoolsOverLimit(counts: readonly SchoolSeatCount[], limit: number | null) {
	if (limit === null) return [];
	return counts.filter((count) => count.seats > limit);
}

/**
 * The school `added` more seats would take past the limit, with the seats it would then have;
 * undefined when it stays within it (or there is no school or no limit).
 */
export function exceededBy(
	counts: readonly SchoolSeatCount[],
	school: SeatSchool | undefined,
	added: number,
	limit: number | null
) {
	if (!school || limit === null || added <= 0) return undefined;
	const seats = (counts.find((count) => count.schoolId === school.id)?.seats ?? 0) + added;
	return seats > limit ? { name: school.name, seats, limit } : undefined;
}
