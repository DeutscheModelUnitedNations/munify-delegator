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

/** The school of an application or a person, if it named one. */
export type SchoolLookup = (id: string) => SeatSchool | null | undefined;

/**
 * Where the board finds schools: each person's own (`conferenceParticipant.school`), as a
 * delegation member or a single participant. A delegation keeps none of its own.
 */
export interface SchoolLookups {
	member: SchoolLookup;
	single: SchoolLookup;
}

type Nullable<T> = T | null | undefined;

/** The lookups from the board's rows: delegations with their members' own schools, and singles. */
export function schoolLookupsOf(
	delegations: readonly {
		members: readonly { id: string; school?: Nullable<SeatSchool> }[];
	}[],
	singles: readonly { id: string; school?: Nullable<SeatSchool> }[]
): SchoolLookups {
	const memberSchools = new Map(
		delegations.flatMap((d) => d.members.map((member) => [member.id, member.school]))
	);
	const singleSchools = new Map(singles.map((single) => [single.id, single.school]));
	return {
		member: (id) => memberSchools.get(id),
		single: (id) => singleSchools.get(id)
	};
}

/** Seats one school takes. */
export interface SchoolSeats {
	school: SeatSchool;
	seats: number;
}

/**
 * The seats a group of the board takes, by school. Each person counts for their own school: a
 * delegation the assignment merged from several schools counts towards each of them. A converted
 * single participant counts for theirs; people without a school count for none.
 */
export function schoolsOfGroup(
	group: Pick<AssignmentGroup, 'singleParticipantId' | 'memberIds'>,
	lookups: SchoolLookups
): SchoolSeats[] {
	if (group.singleParticipantId) {
		const school = lookups.single(group.singleParticipantId);
		return school ? [{ school, seats: 1 }] : [];
	}
	const bySchool = new Map<string, SchoolSeats>();
	for (const memberId of group.memberIds) {
		const school = lookups.member(memberId);
		if (!school) continue;
		const entry = bySchool.get(school.id) ?? { school, seats: 0 };
		entry.seats += 1;
		bySchool.set(school.id, entry);
	}
	return [...bySchool.values()];
}

/**
 * Seats per school in the plan: every person holding a role counts for their school, a single
 * participant holding a custom role too. Most seats first; people without a school are left out.
 */
export function schoolSeats(
	view: {
		groups: readonly AssignmentGroup[];
		singles: readonly { singleParticipantId: string; roleId: string | null }[];
	},
	lookups: SchoolLookups
): SchoolSeatCount[] {
	const counts = new Map<string, SchoolSeatCount>();
	const add = ({ school, seats }: SchoolSeats) => {
		const entry = counts.get(school.id) ?? { schoolId: school.id, name: school.name, seats: 0 };
		entry.seats += seats;
		counts.set(school.id, entry);
	};
	for (const group of view.groups) {
		if (targetKey(group.target)) schoolsOfGroup(group, lookups).forEach(add);
	}
	for (const single of view.singles) {
		const school = single.roleId ? lookups.single(single.singleParticipantId) : undefined;
		if (school) add({ school, seats: 1 });
	}
	return [...counts.values()].sort((a, b) => b.seats - a.seats || a.name.localeCompare(b.name));
}

/** The schools past the limit; none without one. */
export function schoolsOverLimit(counts: readonly SchoolSeatCount[], limit: number | null) {
	if (limit === null) return [];
	return counts.filter((count) => count.seats > limit);
}

/**
 * The first school that `added` seats would take past the limit, with the seats it would then
 * have; undefined when every school stays within it (or there is no limit).
 */
export function exceededBy(
	counts: readonly SchoolSeatCount[],
	added: readonly SchoolSeats[],
	limit: number | null
) {
	if (limit === null) return undefined;
	for (const { school, seats: more } of added) {
		const seats = (counts.find((count) => count.schoolId === school.id)?.seats ?? 0) + more;
		if (more > 0 && seats > limit) return { name: school.name, seats, limit };
	}
	return undefined;
}
