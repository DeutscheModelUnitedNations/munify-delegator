import { graphql } from '$houdini';
import type { PageServerLoad } from './$types';

const SurveyResultsQuery = graphql(`
	query SurveyResultsMainPage($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			timezone
		}
		findManySurveyQuestions(
			where: { conferenceId: { equals: $conferenceId } }
			orderBy: { createdAt: desc }
		) {
			id
			title
			description
			deadline
			draft
			hidden
			showSelectionOnDashboard
			options {
				id
				title
				description
				countSurveyAnswers
				upperLimit
			}
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const { data } = await SurveyResultsQuery.fetch({
		event,
		variables: { conferenceId: event.params.conferenceId },
		blocking: true
	});

	return {
		surveys: data?.findManySurveyQuestions ?? [],
		conferenceId: event.params.conferenceId,
		conferenceTimezone: data?.findUniqueConference?.timezone ?? 'UTC'
	};
};
