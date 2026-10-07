import {
	NO_TARGET,
	assignmentGroups,
	sameTarget,
	singleRoles,
	targetKey,
	type AssignmentGroup,
	type DraftSingleRole,
	type DraftUnit,
	type LiveDelegation,
	type LiveSingleParticipant,
	type Target
} from './state';

/** An existing delegation, or the n-th one the plan creates. */
export type DelegationRef = { existing: string } | { created: number };

/** What has to be fixed in the draft before it can be applied. */
export type ApplyError =
	| { type: 'incompleteSplit'; delegationId: string; memberIds: string[] }
	| { type: 'overCapacity'; target: Target; seats: number; assigned: number }
	| { type: 'deletesPapers'; delegationId: string };

/** What can be applied but probably should not be. */
type ApplyWarning = {
	type: 'roleOverCapacity';
	roleId: string;
	seats: number;
	assigned: number;
};

export interface ApplyPlan {
	/** Delegations to create, each copying school and texts from where its people come from. */
	newDelegations: { copyFrom: { delegationId: string } | { singleParticipantId: string } }[];
	/** Existing delegations whose role changes. Cleared before any is set: roles are unique. */
	clearTargets: string[];
	setTargets: { delegation: DelegationRef; target: Target }[];
	/** Delegation members moving to another delegation. */
	moveMembers: { memberId: string; to: DelegationRef; isHeadDelegate: boolean }[];
	/** Members whose role changes, so the committee they were seated in no longer applies. */
	resetCommittees: string[];
	/** Single participants becoming a member of a delegation. */
	convertSingles: { singleParticipantId: string; to: DelegationRef; isHeadDelegate: boolean }[];
	/** Delegations left without members. */
	deleteDelegations: string[];
	singleRoles: { singleParticipantId: string; roleId: string | null }[];
}

export interface ApplyInput {
	delegations: readonly (LiveDelegation & { hasPapers?: boolean })[];
	singleParticipants: readonly LiveSingleParticipant[];
	units: readonly DraftUnit[];
	draftSingleRoles: readonly DraftSingleRole[];
	/** Seats per role key (`targetKey`). */
	seats: ReadonlyMap<string, number>;
	/** Seats per custom role id. */
	roleSeats?: ReadonlyMap<string, number>;
}

/** Someone arriving in a delegation: a moved member or a converted single participant. */
type Arrival = { memberId: string; wasHead: boolean } | { singleParticipantId: string };

class PlanBuilder {
	plan: ApplyPlan = {
		newDelegations: [],
		clearTargets: [],
		setTargets: [],
		moveMembers: [],
		resetCommittees: [],
		convertSingles: [],
		deleteDelegations: [],
		singleRoles: []
	};

	constructor(private readonly delegations: ReadonlyMap<string, LiveDelegation>) {}

	create(group: AssignmentGroup): DelegationRef {
		const copyFrom = group.delegationId
			? { delegationId: group.delegationId }
			: { singleParticipantId: group.singleParticipantId ?? '' };
		this.plan.newDelegations.push({ copyFrom });
		return { created: this.plan.newDelegations.length - 1 };
	}

	/** Moves people into a delegation, making one of them head delegate if it has none. */
	arrive(to: DelegationRef, arrivals: Arrival[], hasHead: boolean) {
		const headIndex = hasHead
			? -1
			: Math.max(
					0,
					arrivals.findIndex((arrival) => 'wasHead' in arrival && arrival.wasHead)
				);
		arrivals.forEach((arrival, index) => {
			const isHeadDelegate = index === headIndex;
			if ('memberId' in arrival) {
				this.plan.moveMembers.push({ memberId: arrival.memberId, to, isHeadDelegate });
			} else {
				this.plan.convertSingles.push({
					singleParticipantId: arrival.singleParticipantId,
					to,
					isHeadDelegate
				});
			}
		});
	}

	arrivalsOf(group: AssignmentGroup): Arrival[] {
		if (group.singleParticipantId) return [{ singleParticipantId: group.singleParticipantId }];
		const members = this.delegations.get(group.delegationId ?? '')?.members ?? [];
		return group.memberIds.map((memberId) => ({
			memberId,
			wasHead: members.some((member) => member.id === memberId && member.isHeadDelegate)
		}));
	}

	resetCommitteesOf(group: AssignmentGroup, target: Target) {
		if (!sameTarget(group.liveTarget, target)) this.plan.resetCommittees.push(...group.memberIds);
	}
}

/** Carrier first: the delegation already holding the role, then the largest whole one. */
function carrierOrder(a: AssignmentGroup, b: AssignmentGroup) {
	if (a.pending !== b.pending) return a.pending ? 1 : -1;
	if (a.size !== b.size) return b.size - a.size;
	return a.key.localeCompare(b.key);
}

/** Merges every group given one role into a single delegation carrying it. */
function planRole(builder: PlanBuilder, target: Target, groups: AssignmentGroup[]) {
	const carrier = groups
		.filter((group) => group.whole && group.delegationId)
		.sort(carrierOrder)
		.at(0);
	const to: DelegationRef = carrier?.delegationId
		? { existing: carrier.delegationId }
		: builder.create(groups[0]);

	if (!carrier || !sameTarget(carrier.liveTarget, target)) {
		builder.plan.setTargets.push({ delegation: to, target });
	}
	if (carrier) builder.resetCommitteesOf(carrier, target);

	const arriving = groups.filter((group) => group !== carrier);
	for (const group of arriving) builder.resetCommitteesOf(group, target);
	const hasHead =
		!!carrier &&
		builder.arrivalsOf(carrier).some((arrival) => 'wasHead' in arrival && arrival.wasHead);
	builder.arrive(
		to,
		arriving.flatMap((group) => builder.arrivalsOf(group)),
		hasHead
	);
}

/** A group the draft takes the role from: a whole delegation keeps its row, a part gets its own. */
function planUnassigned(builder: PlanBuilder, group: AssignmentGroup) {
	// A single participant turned into a delegation without a role would gain nothing.
	if (group.singleParticipantId) return;
	builder.resetCommitteesOf(group, NO_TARGET);
	if (group.whole) return;
	builder.arrive(builder.create(group), builder.arrivalsOf(group), false);
}

/** Delegations whose every member moves away, and delegations whose role changes. */
function settleDelegations(builder: PlanBuilder, input: ApplyInput, errors: ApplyError[]) {
	const moving = new Set(builder.plan.moveMembers.map((move) => move.memberId));
	const finalTargets = new Map(
		builder.plan.setTargets.flatMap(({ delegation, target }) =>
			'existing' in delegation ? [[delegation.existing, target] as const] : []
		)
	);

	for (const delegation of input.delegations) {
		const emptied =
			delegation.members.length > 0 && delegation.members.every((m) => moving.has(m.id));
		if (emptied) {
			builder.plan.deleteDelegations.push(delegation.id);
			if (delegation.hasPapers) errors.push({ type: 'deletesPapers', delegationId: delegation.id });
		}
		const final = emptied ? NO_TARGET : finalTargets.get(delegation.id);
		if (final && targetKey(delegation) && !sameTarget(delegation, final)) {
			builder.plan.clearTargets.push(delegation.id);
		}
	}
}

/** Unassigned whole delegations are cleared explicitly: no carrier sets anything on them. */
function clearUnassigned(builder: PlanBuilder, groups: AssignmentGroup[]) {
	for (const group of groups) {
		if (!group.whole || !group.delegationId || targetKey(group.target)) continue;
		if (targetKey(group.liveTarget) && !builder.plan.clearTargets.includes(group.delegationId)) {
			builder.plan.clearTargets.push(group.delegationId);
		}
	}
}

function planSingleRoles(builder: PlanBuilder, input: ApplyInput, warnings: ApplyWarning[]) {
	const converted = new Set(builder.plan.convertSingles.map((c) => c.singleParticipantId));
	const roles = singleRoles(input.singleParticipants, input.draftSingleRoles, converted);
	builder.plan.singleRoles = roles
		.filter((role) => role.pending)
		.map(({ singleParticipantId, roleId }) => ({ singleParticipantId, roleId }));

	const assigned = Map.groupBy(
		roles.filter((role) => role.roleId),
		(role) => role.roleId ?? ''
	);
	for (const [roleId, holders] of assigned) {
		const seats = input.roleSeats?.get(roleId);
		if (seats !== undefined && holders.length > seats) {
			warnings.push({ type: 'roleOverCapacity', roleId, seats, assigned: holders.length });
		}
	}
}

/**
 * What applying the draft does to the live registrations.
 *
 * Every role ends up with exactly one delegation: the groups given one are merged into the
 * delegation already holding it, else into the largest delegation that goes there whole, else
 * into a new one. Members move rather than being re-created, so supervision links, participant
 * status and everything else pointing at them survive. A delegation everybody leaves is deleted.
 */
export function planApply(input: ApplyInput) {
	const { groups, incompleteSplits } = assignmentGroups(
		input.delegations,
		input.singleParticipants,
		input.units
	);
	const errors: ApplyError[] = incompleteSplits.map((split) => ({
		type: 'incompleteSplit',
		...split
	}));
	const warnings: ApplyWarning[] = [];
	const builder = new PlanBuilder(new Map(input.delegations.map((d) => [d.id, d])));

	const byRole = Map.groupBy(groups, (group) => targetKey(group.target) ?? '');
	for (const [key, roleGroups] of byRole) {
		if (!roleGroups.some((group) => group.pending)) continue;
		if (key === '') {
			for (const group of roleGroups.filter((g) => g.pending)) planUnassigned(builder, group);
			continue;
		}
		const assigned = roleGroups.reduce((sum, group) => sum + group.size, 0);
		const seats = input.seats.get(key) ?? 0;
		if (assigned > seats) {
			errors.push({ type: 'overCapacity', target: roleGroups[0].target, seats, assigned });
		}
		planRole(builder, roleGroups[0].target, roleGroups);
	}

	settleDelegations(builder, input, errors);
	clearUnassigned(builder, groups);
	planSingleRoles(builder, input, warnings);

	return { plan: builder.plan, errors, warnings, groups };
}

/** Whether a plan changes anything at all. */
export function planIsEmpty(plan: ApplyPlan) {
	return (
		plan.newDelegations.length === 0 &&
		plan.clearTargets.length === 0 &&
		plan.setTargets.length === 0 &&
		plan.moveMembers.length === 0 &&
		plan.convertSingles.length === 0 &&
		plan.deleteDelegations.length === 0 &&
		plan.singleRoles.length === 0
	);
}
