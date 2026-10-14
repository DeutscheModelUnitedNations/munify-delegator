import { faker } from '@faker-js/faker';
import type { ConferenceSeed } from './context';
import { nationSeats } from './conference';

/**
 * An assignment the team is halfway through: two in three applications rated, a few flagged, one
 * disqualified, the largest delegation split in two, a couple of delegations and single
 * participants with a planned role. Nothing of it is applied yet.
 */
export function addAssignmentDraft(cs: ConferenceSeed) {
	const [largest, ...rest] = appliedDelegationIds(cs).toSorted(
		(a, b) => membersOf(cs, b).length - membersOf(cs, a).length
	);
	addReviews(cs, appliedDelegationIds(cs));
	if (largest) addSplit(cs, largest);
	addPlannedNations(cs, rest.slice(0, 6));
	addPlannedSingleRoles(cs);
	cs.batch.assignmentWeights.push({ conferenceId: cs.id });
}

function appliedDelegationIds(cs: ConferenceSeed) {
	return cs.batch.delegation.flatMap((delegation) =>
		delegation.conferenceId === cs.id && delegation.applied && delegation.id ? [delegation.id] : []
	);
}

function membersOf(cs: ConferenceSeed, delegationId: string) {
	return cs.batch.delegationMember.flatMap((member) =>
		member.delegationId === delegationId && member.id ? [member.id] : []
	);
}

/** Two in three applications rated; some flagged, some with a note, one disqualified. */
function addReviews(cs: ConferenceSeed, delegationIds: string[]) {
	delegationIds.forEach((delegationId, index) => {
		if (index % 3 === 2) return;
		cs.batch.assignmentReview.push({
			conferenceId: cs.id,
			delegationId,
			evaluation: faker.helpers.arrayElement([1, 2, 2.5, 3, 3.5, 4, 4.5, 5]),
			flagged: index % 5 === 0,
			disqualified: index === 4,
			note: index % 4 === 1 ? faker.lorem.sentence() : null
		});
	});
}

/** The delegation split into two halves, if it is large enough to be worth splitting. */
function addSplit(cs: ConferenceSeed, delegationId: string) {
	const memberIds = membersOf(cs, delegationId);
	if (memberIds.length < 4) return;
	const half = Math.ceil(memberIds.length / 2);
	[memberIds.slice(0, half), memberIds.slice(half)].forEach((part, index) => {
		const unitId = cs.rowId(`assignment-split-${index}`);
		cs.batch.assignmentUnit.push({
			id: unitId,
			conferenceId: cs.id,
			sourceDelegationId: delegationId
		});
		cs.batch.assignmentUnitMember.push(
			...part.map((delegationMemberId) => ({ conferenceId: cs.id, unitId, delegationMemberId }))
		);
	});
}

/** Two of the delegations get a nation that fits them exactly. */
function addPlannedNations(cs: ConferenceSeed, delegationIds: string[]) {
	const nations = [...new Set(cs.committees.flatMap((committee) => committee.nations))];
	const taken = new Set<string>();
	for (const delegationId of delegationIds) {
		const size = membersOf(cs, delegationId).length;
		const nation = nations.find((code) => !taken.has(code) && nationSeats(cs, code) === size);
		if (!nation || taken.size >= 2) continue;
		taken.add(nation);
		cs.batch.assignmentUnit.push({
			conferenceId: cs.id,
			sourceDelegationId: delegationId,
			nationAlpha3Code: nation
		});
	}
}

/** The first two single participants get a custom role. */
function addPlannedSingleRoles(cs: ConferenceSeed) {
	const singleIds = cs.batch.singleParticipant.flatMap((single) =>
		single.conferenceId === cs.id && single.applied && single.id ? [single.id] : []
	);
	singleIds.slice(0, 2).forEach((singleParticipantId, index) => {
		cs.batch.assignmentSingleRole.push({
			conferenceId: cs.id,
			singleParticipantId,
			roleId: cs.customRoleIds[index % cs.customRoleIds.length]
		});
	});
}
