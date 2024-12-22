import { graphql } from '$houdini';

export const delegaitonResetMutation = graphql(`
	mutation ResetDelegationEntryCodeMutation(
		$delegationId: String!
		$resetEntryCode: Boolean
		$applied: Boolean
	) {
		updateOneDelegation(
			where: { id: $delegationId }
			resetEntryCode: $resetEntryCode
			applied: $applied
		) {
			id
			entryCode
			applied
		}
	}
`);
