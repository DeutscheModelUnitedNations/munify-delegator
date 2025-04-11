import { graphql } from '$houdini';

export const certificateQuery = graphql(`
	query CertificateQuery($conferenceId: String!, $userId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			certificateContent
			title
		}
		getCertificateJWT(
			where: { userId_conferenceId: { conferenceId: $conferenceId, userId: $userId } }
		) {
			jwt
			fullName
		}
	}
`);
