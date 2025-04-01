import { graphql } from '$houdini';

export const changeParticipantStatus = graphql(`
	mutation changeParticipantStatusMutation(
		$where: ConferenceParticipantStatusWhereUniqueInputNotRequired!
		$data: UpdateConferenceParticipantStatusInput!
	) {
		updateOneConferenceParticipantStatus(where: $where, data: $data) {
			id
			termsAndConditions
			guardianConsent
			mediaConsent
			paymentStatus
			didAttend
		}
	}
`);
