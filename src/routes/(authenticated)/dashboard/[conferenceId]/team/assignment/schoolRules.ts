import { targetKey, type AssignmentGroup } from '#lib/assignment/state';

/**
 * The conference's rules about schools, which the assignment checks and only warns about:
 *
 * - **Decided together.** The students of one supervisor from one school who applied are a group
 *   (`collectiveGroups`). Up to `conference.maxCollectiveGroupSize` of them, they all get a seat or
 *   none do; a bigger group is treated like everyone else.
 * - **Guaranteed seats abroad.** Of one Auslandsschule (`school.isForeignSchool`), at most
 *   `conference.maxGuaranteedSeatsPerForeignSchool` people may be in applications marked required
 *   (`assignmentReview.required`); beyond that they are regular applicants.
 *
 * Pure: the board, the sighting and the summary all check through these.
 */

export interface RuleSchool {
	id: string;
	name: string;
	isForeignSchool: boolean;
}

type Nullable<T> = T | null | undefined;

/** A supervisor with their students, as the assignment reads them (`fetchSchoolRules`). */
export interface SupervisedStudents {
	id: string;
	supervisedDelegationMembers: readonly {
		id: string;
		delegation: { id: string; applied: boolean };
		school?: Nullable<RuleSchool>;
	}[];
	supervisedSingleParticipants: readonly {
		id: string;
		applied: boolean;
		school?: Nullable<RuleSchool>;
	}[];
}

/** The students of one supervisor from one school who applied, to be decided on together. */
export interface CollectiveGroup<S extends SupervisedStudents = SupervisedStudents> {
	key: string;
	supervisor: S;
	school: RuleSchool;
	/** Delegation members, with the delegation whose review decides about them */
	members: { id: string; delegationId: string }[];
	singleParticipantIds: string[];
	size: number;
}

/**
 * The groups decided together: per supervisor and school, the students who applied, as long as
 * there are at most `limit` of them. A student with two supervisors is in two groups; one without
 * a supervisor or a school is in none. No limit, no groups.
 */
export function collectiveGroups<S extends SupervisedStudents>({
	supervisors,
	limit
}: {
	supervisors: readonly S[];
	limit: number | null;
}): CollectiveGroup<S>[] {
	if (limit === null) return [];
	const groups = new Map<string, CollectiveGroup<S>>();
	const groupOf = ({ supervisor, school }: { supervisor: S; school: RuleSchool }) => {
		const key = `${supervisor.id}:${school.id}`;
		const group = groups.get(key) ?? {
			key,
			supervisor,
			school,
			members: [],
			singleParticipantIds: [],
			size: 0
		};
		groups.set(key, group);
		return group;
	};
	for (const supervisor of supervisors) {
		for (const member of supervisor.supervisedDelegationMembers) {
			if (!member.school || !member.delegation.applied) continue;
			const group = groupOf({ supervisor, school: member.school });
			group.members.push({ id: member.id, delegationId: member.delegation.id });
			group.size += 1;
		}
		for (const single of supervisor.supervisedSingleParticipants) {
			if (!single.school || !single.applied) continue;
			const group = groupOf({ supervisor, school: single.school });
			group.singleParticipantIds.push(single.id);
			group.size += 1;
		}
	}
	return [...groups.values()]
		.filter((group) => group.size <= limit)
		.sort((a, b) => a.school.name.localeCompare(b.school.name) || a.key.localeCompare(b.key));
}

/** The people after applying, as the board sees them: groups with their role, singles with theirs. */
export interface PlannedSeats {
	groups: readonly Pick<AssignmentGroup, 'memberIds' | 'singleParticipantId' | 'target'>[];
	singles: readonly { singleParticipantId: string; roleId: string | null }[];
}

/**
 * Who holds a seat once the draft is applied: delegation members and single participants. The
 * board holds every application that has a seat or that the draft touches, so anyone else has none.
 */
export function seatedPeople(state: PlannedSeats) {
	const members = new Set<string>();
	const singles = new Set<string>();
	for (const group of state.groups) {
		if (!targetKey(group.target)) continue;
		group.memberIds.forEach((id) => members.add(id));
		if (group.singleParticipantId) singles.add(group.singleParticipantId);
	}
	for (const single of state.singles) {
		if (single.roleId) singles.add(single.singleParticipantId);
	}
	return { members, singles };
}

/** The applications the sighting excluded (`assignmentReview.disqualified`). */
export interface Disqualified {
	delegationIds: ReadonlySet<string>;
	singleParticipantIds: ReadonlySet<string>;
}

/** A group decided together whose plan or sighting splits it. */
export interface CollectiveGroupProblem<S extends SupervisedStudents = SupervisedStudents> {
	group: CollectiveGroup<S>;
	/** How many of it would hold a seat */
	seated: number;
	/** How many of it the sighting excluded */
	disqualified: number;
	/** The applications (delegations, single participants) of it that would get no seat */
	unseatedApplicationIds: string[];
}

/**
 * The groups the plan would split: some of their people get a seat and others do not, or the
 * sighting excluded some of them but not all. A group seated or excluded as a whole is fine.
 */
export function collectiveGroupProblems<S extends SupervisedStudents>({
	groups,
	state,
	disqualified
}: {
	groups: readonly CollectiveGroup<S>[];
	state: PlannedSeats;
	disqualified: Disqualified;
}): CollectiveGroupProblem<S>[] {
	const seated = seatedPeople(state);
	return groups.flatMap((group) => {
		const count = (
			member: (m: { id: string; delegationId: string }) => boolean,
			single: (id: string) => boolean
		) => group.members.filter(member).length + group.singleParticipantIds.filter(single).length;
		const seatedCount = count(
			(member) => seated.members.has(member.id),
			(id) => seated.singles.has(id)
		);
		const disqualifiedCount = count(
			(member) => disqualified.delegationIds.has(member.delegationId),
			(id) => disqualified.singleParticipantIds.has(id)
		);
		const splits = (part: number) => part > 0 && part < group.size;
		if (!splits(seatedCount) && !splits(disqualifiedCount)) return [];
		const unseatedApplicationIds = [
			...new Set([
				...group.members
					.filter((member) => !seated.members.has(member.id))
					.map((member) => member.delegationId),
				...group.singleParticipantIds.filter((id) => !seated.singles.has(id))
			])
		];
		return [
			{ group, seated: seatedCount, disqualified: disqualifiedCount, unseatedApplicationIds }
		];
	});
}

/** The groups decided together that an application belongs to, for its card in the sighting. */
export function collectiveGroupsOf<S extends SupervisedStudents>({
	groups,
	application
}: {
	groups: readonly CollectiveGroup<S>[];
	application: { delegationId: string } | { singleParticipantId: string };
}) {
	return groups.filter((group) =>
		'delegationId' in application
			? group.members.some((member) => member.delegationId === application.delegationId)
			: group.singleParticipantIds.includes(application.singleParticipantId)
	);
}

/** An application marked required, with the schools of its people. */
export interface GuaranteedApplication {
	delegationId?: string | null;
	singleParticipantId?: string | null;
	delegation?: Nullable<{ members: readonly { school?: Nullable<RuleSchool> }[] }>;
	singleParticipant?: Nullable<{ school?: Nullable<RuleSchool> }>;
}

/** How many guaranteed seats the people of one Auslandsschule take. */
export interface GuaranteedSeatCount {
	school: RuleSchool;
	seats: number;
}

/** The people of an application by their schools: a delegation's members each count for theirs. */
function schoolsOfApplication(application: GuaranteedApplication) {
	const schools = application.delegation
		? application.delegation.members.map((member) => member.school)
		: [application.singleParticipant?.school];
	return schools.filter((school): school is RuleSchool => !!school);
}

/** The id of the application a review is about. */
const applicationId = (application: GuaranteedApplication) =>
	application.delegationId ?? application.singleParticipantId ?? undefined;

/**
 * The guaranteed seats per Auslandsschule: everyone in an application marked required counts for
 * their own school, so a delegation mixing schools counts for each. Schools in the country are left
 * out, the limit is not theirs. Most seats first.
 */
export function guaranteedSeatsAbroad(
	applications: readonly GuaranteedApplication[]
): GuaranteedSeatCount[] {
	const counts = new Map<string, GuaranteedSeatCount>();
	for (const school of applications.flatMap(schoolsOfApplication)) {
		if (!school.isForeignSchool) continue;
		const count = counts.get(school.id) ?? { school, seats: 0 };
		count.seats += 1;
		counts.set(school.id, count);
	}
	return [...counts.values()].sort(
		(a, b) => b.seats - a.seats || a.school.name.localeCompare(b.school.name)
	);
}

/** The Auslandsschulen given more guaranteed seats than the limit; none without one. */
export function guaranteesOverLimit({
	counts,
	limit
}: {
	counts: readonly GuaranteedSeatCount[];
	limit: number | null;
}) {
	return limit === null ? [] : counts.filter((count) => count.seats > limit);
}

/**
 * The guaranteed seats of the Auslandsschulen an application's people come from, as they stand
 * with the application required or not (`required`), whatever the stored reviews still say about
 * it: the sighting shows its own change before the backend has it.
 */
export function guaranteesAround({
	applications,
	application,
	required
}: {
	applications: readonly GuaranteedApplication[];
	application: GuaranteedApplication;
	required: boolean;
}): GuaranteedSeatCount[] {
	const id = applicationId(application);
	const others = applications.filter((other) => applicationId(other) !== id);
	const counts = guaranteedSeatsAbroad(required ? [...others, application] : others);
	const own = new Map(
		schoolsOfApplication(application)
			.filter((school) => school.isForeignSchool)
			.map((school) => [school.id, school])
	);
	return [...own.values()].map(
		(school) => counts.find((count) => count.school.id === school.id) ?? { school, seats: 0 }
	);
}

/** A review of the sighting, as far as the school rules read it. */
export interface RuleReview extends GuaranteedApplication {
	required: boolean;
	disqualified: boolean;
}

/**
 * Where the plan breaks the school rules: the groups decided together it splits (counting the
 * sighting's exclusions), and the Auslandsschulen past the limit of guaranteed seats.
 */
export function schoolRuleBreaches<S extends SupervisedStudents>({
	supervisors,
	reviews,
	groupLimit,
	guaranteeLimit,
	plan
}: {
	supervisors: readonly S[];
	reviews: readonly RuleReview[];
	groupLimit: number | null;
	guaranteeLimit: number | null;
	plan: PlannedSeats;
}) {
	const excluded = reviews.filter((review) => review.disqualified);
	const disqualified = {
		delegationIds: new Set(excluded.flatMap((review) => review.delegationId ?? [])),
		singleParticipantIds: new Set(excluded.flatMap((review) => review.singleParticipantId ?? []))
	};
	return {
		splitGroups: collectiveGroupProblems({
			groups: collectiveGroups({ supervisors, limit: groupLimit }),
			state: plan,
			disqualified
		}),
		overGuarantee: guaranteesOverLimit({
			counts: guaranteedSeatsAbroad(reviews.filter((review) => review.required)),
			limit: guaranteeLimit
		})
	};
}
