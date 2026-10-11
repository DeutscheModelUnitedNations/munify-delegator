import { client } from '$lib/api/rumbleClient/client';
import { assignmentMutation, roleArgs } from '$lib/assignment/board';
import type { AssignmentGroup, Target } from '$lib/assignment/state';
import { succeeded } from './toastError';

type Mutation = NonNullable<ReturnType<typeof assignmentMutation>>;

function planRole(mutation: Mutation, role: ReturnType<typeof roleArgs>) {
	return mutation.kind === 'unit'
		? client.mutate.assignAssignmentUnit({ __args: { unitId: mutation.unitId, ...role } })
		: client.mutate.assignDelegation({ __args: { delegationId: mutation.delegationId, ...role } });
}

/**
 * Plans a role for a group, or takes it away (`target` null); see `assignmentMutation`. Whether it
 * worked: a failure has been shown already.
 */
export async function assignGroup(group: AssignmentGroup, target: Target | null = null) {
	const mutation = assignmentMutation(group);
	if (!mutation) return false;
	return succeeded(planRole(mutation, roleArgs(target)));
}
