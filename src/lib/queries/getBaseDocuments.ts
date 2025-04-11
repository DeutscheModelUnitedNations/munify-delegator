import { graphql } from '$houdini';

export const getBaseDocumentsForPostal = graphql(`
	query GetBaseDocuments($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			id
			contractContent
			guardianConsentContent
			mediaConsentContent
			termsAndConditionsContent
		}
	}
`);
