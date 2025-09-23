import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query SurveyResultsDetailsPage($conferenceId: String!, $surveyId: String!) {
		findUniqueSurveyQuestion(where: { id: $surveyId }) {
			id
			title
			description
			deadline
			draft
			options {
				id
				title
				description
				countSurveyAnswers
				upperLimit
			}
			surveyAnswers {
				id
				option {
					id
				}
				user {
					id
					given_name
					family_name
				}
			}
		}
		findManyUsers(
			where: {
				surveyAnswers: { none: { questionId: { equals: $surveyId } } }
				OR: [
					{
						delegationMemberships: {
							some: {
								conferenceId: { equals: $conferenceId }
								delegation: {
									OR: [
										{ assignedNationAlpha3Code: { not: { equals: null } } }
										{ assignedNonStateActorId: { not: { equals: null } } }
									]
								}
							}
						}
					}
					{
						singleParticipant: {
							some: {
								AND: [
									{ conferenceId: { equals: $conferenceId } }
									{ assignedRoleId: { not: { equals: null } } }
								]
							}
						}
					}
				]
			}
		) {
			id
			given_name
			family_name
		}
	}
`);

export const _SurveyResultsDetailsPageVariables = async (event) => {
	const { conferenceId, surveyId } = event.params;
	return { conferenceId, surveyId };
};
