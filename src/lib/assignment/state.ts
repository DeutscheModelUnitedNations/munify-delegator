/**
 * The assignment as the team is planning it: the live registrations with the draft's pending
 * changes on top. Pure, so the board in the browser and `applyAssignment` on the server read the
 * draft the same way.
 */

/** A role a delegation can hold. Both null: no role. */
export interface Target {
	nationAlpha3Code: string | null;
	nonStateActorId: string | null;
}

export const NO_TARGET: Target = { nationAlpha3Code: null, nonStateActorId: null };

/** One key per role, `undefined` for no role - what groups are bucketed and seats counted by. */
export function targetKey(target: Target): string | undefined {
	if (target.nationAlpha3Code) return `nation:${target.nationAlpha3Code}`;
	if (target.nonStateActorId) return `nsa:${target.nonStateActorId}`;
	return undefined;
}

export function sameTarget(a: Target, b: Target) {
	return targetKey(a) === targetKey(b);
}

export interface LiveDelegation {
	id: string;
	nationAlpha3Code: string | null;
	nonStateActorId: string | null;
	members: { id: string; isHeadDelegate: boolean }[];
}

export interface LiveSingleParticipant {
	id: string;
	roleId: string | null;
}

export interface DraftUnit {
	id: string;
	sourceDelegationId: string | null;
	sourceSingleParticipantId: string | null;
	nationAlpha3Code: string | null;
	nonStateActorId: string | null;
	/** The delegation members of one part of a split delegation; empty for a whole delegation. */
	memberIds: string[];
}

export interface DraftSingleRole {
	singleParticipantId: string;
	roleId: string | null;
}

/** Something the board shows as one card and the draft assigns as one: who goes where. */
export interface AssignmentGroup {
	/** Stable across renders: the unit's id, or the delegation's for one the draft leaves alone. */
	key: string;
	/** The draft unit behind the group, if the draft touches it. */
	unitId: string | null;
	/** The delegation the people come from. */
	delegationId: string | null;
	/** The single participant the draft turns into a delegation. */
	singleParticipantId: string | null;
	/** The delegation members in the group; empty for a single participant. */
	memberIds: string[];
	/** How many seats the group takes. */
	size: number;
	/** Whether the group is all of its delegation, so the delegation itself can carry the role. */
	whole: boolean;
	/** Whether the group is one part of a split delegation, assigned through its unit. */
	part: boolean;
	target: Target;
	liveTarget: Target;
	/** Whether applying the draft changes anything for these people. */
	pending: boolean;
}

/** A split that leaves somebody out: they would end up without a delegation. */
interface IncompleteSplit {
	delegationId: string;
	memberIds: string[];
}

const targetOf = (row: Target): Target => ({
	nationAlpha3Code: row.nationAlpha3Code,
	nonStateActorId: row.nonStateActorId
});

function groupsOfDelegation(delegation: LiveDelegation, units: DraftUnit[]) {
	const liveTarget = targetOf(delegation);
	const memberIds = delegation.members.map((member) => member.id);
	const whole = (unit: DraftUnit | undefined): AssignmentGroup => {
		const target = unit ? targetOf(unit) : liveTarget;
		return {
			key: unit?.id ?? delegation.id,
			unitId: unit?.id ?? null,
			delegationId: delegation.id,
			singleParticipantId: null,
			memberIds,
			size: memberIds.length,
			whole: true,
			part: false,
			target,
			liveTarget,
			pending: !sameTarget(target, liveTarget)
		};
	};

	const parts = units.filter((unit) => unit.memberIds.length > 0);
	if (parts.length === 0) return { groups: [whole(units.at(0))], incomplete: undefined };

	const known = new Set(memberIds);
	const groups = parts.map((unit): AssignmentGroup => {
		// A member who left the delegation since the split no longer counts.
		const partMembers = unit.memberIds.filter((id) => known.has(id));
		return {
			key: unit.id,
			unitId: unit.id,
			delegationId: delegation.id,
			singleParticipantId: null,
			memberIds: partMembers,
			size: partMembers.length,
			whole: partMembers.length === memberIds.length,
			part: true,
			target: targetOf(unit),
			liveTarget,
			pending: true
		};
	});
	const covered = new Set(groups.flatMap((group) => group.memberIds));
	const left = memberIds.filter((id) => !covered.has(id));
	return {
		groups: groups.filter((group) => group.size > 0),
		incomplete: left.length > 0 ? { delegationId: delegation.id, memberIds: left } : undefined
	};
}

/** The groups the draft assigns, and the splits it cannot apply as they stand. */
export function assignmentGroups(
	delegations: readonly LiveDelegation[],
	singleParticipants: readonly LiveSingleParticipant[],
	units: readonly DraftUnit[]
) {
	const unitsBySource = Map.groupBy(
		units.filter((unit) => unit.sourceDelegationId),
		(unit) => unit.sourceDelegationId
	);
	const groups: AssignmentGroup[] = [];
	const incompleteSplits: IncompleteSplit[] = [];

	for (const delegation of delegations) {
		const result = groupsOfDelegation(delegation, unitsBySource.get(delegation.id) ?? []);
		groups.push(...result.groups);
		if (result.incomplete) incompleteSplits.push(result.incomplete);
	}

	const singles = new Set(singleParticipants.map((participant) => participant.id));
	for (const unit of units) {
		if (!unit.sourceSingleParticipantId || !singles.has(unit.sourceSingleParticipantId)) continue;
		groups.push({
			key: unit.id,
			unitId: unit.id,
			delegationId: null,
			singleParticipantId: unit.sourceSingleParticipantId,
			memberIds: [],
			size: 1,
			whole: true,
			part: false,
			target: targetOf(unit),
			liveTarget: { ...NO_TARGET },
			pending: true
		});
	}

	return { groups, incompleteSplits };
}

/** The role each single participant ends up with, and whether the draft changes it. */
export function singleRoles(
	singleParticipants: readonly LiveSingleParticipant[],
	draft: readonly DraftSingleRole[],
	/** Single participants the draft turns into delegations, who hold no role any more. */
	converted: ReadonlySet<string> = new Set()
) {
	const drafted = new Map(draft.map((entry) => [entry.singleParticipantId, entry.roleId]));
	return singleParticipants
		.filter((participant) => !converted.has(participant.id))
		.map((participant) => {
			const roleId = drafted.has(participant.id)
				? (drafted.get(participant.id) ?? null)
				: participant.roleId;
			return {
				singleParticipantId: participant.id,
				roleId,
				liveRoleId: participant.roleId,
				pending: roleId !== participant.roleId
			};
		});
}

/** Seats taken per role key by the given groups. */
export function occupancy(groups: readonly AssignmentGroup[]) {
	const taken = new Map<string, number>();
	for (const group of groups) {
		const key = targetKey(group.target);
		if (key) taken.set(key, (taken.get(key) ?? 0) + group.size);
	}
	return taken;
}
