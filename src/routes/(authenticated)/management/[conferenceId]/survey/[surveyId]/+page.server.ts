import { graphql } from '$houdini';
import type { PageServerLoad } from './$types';

const SurveyDetailsQuery = graphql(`
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
				createdAt
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
		findManyDelegationMembers(
			where: {
				conferenceId: { equals: $conferenceId }
				delegation: {
					OR: [
						{ assignedNationAlpha3Code: { not: { equals: null } } }
						{ assignedNonStateActorId: { not: { equals: null } } }
					]
				}
				user: { surveyAnswers: { none: { questionId: { equals: $surveyId } } } }
			}
		) {
			user {
				id
				given_name
				family_name
			}
		}
		findManySingleParticipants(
			where: {
				conferenceId: { equals: $conferenceId }
				assignedRoleId: { not: { equals: null } }
				user: { surveyAnswers: { none: { questionId: { equals: $surveyId } } } }
			}
		) {
			user {
				id
				given_name
				family_name
			}
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const { data } = await SurveyDetailsQuery.fetch({
		event,
		variables: {
			conferenceId: event.params.conferenceId,
			surveyId: event.params.surveyId
		},
		blocking: true
	});

	// Combine delegation members and single participants into a single array
	// Use a Map to deduplicate users who might appear in both lists
	const userMap = new Map<string, { id: string; given_name: string; family_name: string }>();

	for (const dm of data?.findManyDelegationMembers ?? []) {
		userMap.set(dm.user.id, dm.user);
	}
	for (const sp of data?.findManySingleParticipants ?? []) {
		userMap.set(sp.user.id, sp.user);
	}

	return {
		survey: data?.findUniqueSurveyQuestion ?? null,
		usersNotAnswered: Array.from(userMap.values()),
		conferenceId: event.params.conferenceId,
		surveyId: event.params.surveyId
	};
};
