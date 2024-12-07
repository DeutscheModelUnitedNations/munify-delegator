import { graphql } from '$houdini';

export const singleParticipantResetMutation = graphql(`
	mutation ResetSingleParticipantMutation($singleParticipantId: String!, $applied: Boolean) {
		updateOneSingleParticipant(where: { id: $singleParticipantId }, applied: $applied) {
			id
			applied
		}
	}
`);
