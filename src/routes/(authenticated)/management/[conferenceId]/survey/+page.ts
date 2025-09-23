import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query SurveyResultsMainPage($conferenceId: String!) {
		findManySurveyQuestions(where: { conferenceId: { equals: $conferenceId } }) {
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
		}
	}
`);

export const _SurveyResultsMainPageVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
