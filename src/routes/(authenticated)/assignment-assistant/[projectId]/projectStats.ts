export interface SchoolSummary {
	school: string;
	count: number;
	members: number;
}

interface SchoolApplication {
	school?: string;
	/** A delegation's members; a single participant has none and counts as one person. */
	members?: readonly unknown[];
}

/**
 * Applications and people per school, sorted by school name. Applications without a school are
 * listed as "No School".
 */
export function summarizeSchools(applications: readonly SchoolApplication[]): SchoolSummary[] {
	const schools: SchoolSummary[] = [];
	for (const application of applications) {
		const people = application.members?.length ?? 1;
		const schoolEntry = schools.find((x) => x.school === application.school);
		if (schoolEntry) {
			schoolEntry.count += 1;
			schoolEntry.members += people;
		} else {
			schools.push({ school: application.school ?? 'No School', count: 1, members: people });
		}
	}
	return schools.toSorted((a, b) => a.school.localeCompare(b.school));
}

interface NationRef {
	alpha2Code: string;
}

interface NonStateActorRef {
	id: string;
}

type SeatAssignment = NationRef | NonStateActorRef;

interface SeatDelegation {
	members: readonly unknown[];
	assignedNation?: NationRef | null;
	assignedNSA?: NonStateActorRef | null;
}

interface SeatSources {
	delegations: readonly SeatDelegation[];
	nations: readonly { nation: NationRef; seats: number }[];
	nsas: readonly (NonStateActorRef & { seatAmount: number })[];
}

function isAssignedTo(delegation: SeatDelegation, assignment: SeatAssignment) {
	if ('alpha2Code' in assignment) {
		return delegation.assignedNation?.alpha2Code === assignment.alpha2Code;
	}
	return delegation.assignedNSA?.id === assignment.id;
}

function totalSeats(assignment: SeatAssignment, sources: SeatSources) {
	if ('alpha2Code' in assignment) {
		return sources.nations.find((x) => x.nation.alpha2Code === assignment.alpha2Code)?.seats;
	}
	return sources.nsas.find((x) => x.id === assignment.id)?.seatAmount;
}

/** Seats of a nation or non-state actor not yet taken by the members of assigned delegations. */
export function remainingSeats(assignment: SeatAssignment, sources: SeatSources): number {
	const seats = totalSeats(assignment, sources);
	if (!seats) return 0;
	const taken = sources.delegations
		.filter((delegation) => isAssignedTo(delegation, assignment))
		.reduce((acc, x) => acc + x.members.length, 0);
	return seats - taken;
}
