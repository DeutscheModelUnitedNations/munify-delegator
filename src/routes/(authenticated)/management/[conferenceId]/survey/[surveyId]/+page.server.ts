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
				option {
					id
				}
				user {
					id
					given_name
					family_name
					email
					pronouns
					birthday
					delegationMemberships {
						id
						conference {
							id
						}
						delegation {
							assignedNation {
								alpha3Code
							}
							assignedNonStateActor {
								name
							}
						}
						assignedCommittee {
							name
						}
					}
					singleParticipant {
						id
						conference {
							id
						}
						assignedRole {
							name
						}
					}
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
			email
			pronouns
			birthday
			delegationMemberships {
				id
				conference {
					id
				}
				delegation {
					assignedNation {
						alpha3Code
					}
					assignedNonStateActor {
						name
					}
				}
				assignedCommittee {
					name
				}
			}
			singleParticipant {
				id
				conference {
					id
				}
				assignedRole {
					name
				}
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

	return {
		survey: data?.findUniqueSurveyQuestion ?? null,
		usersNotAnswered: data?.findManyUsers ?? [],
		conferenceId: event.params.conferenceId,
		surveyId: event.params.surveyId
	};
};
