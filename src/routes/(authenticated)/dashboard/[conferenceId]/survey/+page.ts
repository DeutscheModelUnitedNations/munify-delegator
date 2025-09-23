import { graphql } from '$houdini';
import type { DashboardSurveyPageQueryVariables } from './$houdini';

export const _houdini_load = graphql(`
	query DashboardSurveyPageQuery($userId: String!, $conferenceId: String!) {
		findManySurveyQuestions(
			where: { conferenceId: { equals: $conferenceId }, draft: { equals: false } }
		) {
			id
			deadline
			title
			description
			options {
				id
				title
				description
				upperLimit
				countSurveyAnswers
			}
		}
		findManySurveyAnswers(
			where: { question: { conferenceId: { equals: $conferenceId } }, userId: { equals: $userId } }
		) {
			id
			question {
				id
			}
			option {
				id
			}
		}
	}
`);

export const _DashboardSurveyPageQueryVariables: DashboardSurveyPageQueryVariables = async (
	event
) => {
	const { user } = await event.parent();

	return {
		userId: user.sub
	};
};
