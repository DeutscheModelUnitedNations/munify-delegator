import { client } from '#lib/api/rumbleClient/client';

/** The conference's visible surveys and how this person answered them. */
export async function fetchSurveys({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId: string;
}) {
	const [questions, answers] = await Promise.all([
		client.liveQuery.surveyQuestions({
			__args: { where: { conferenceId: { eq: conferenceId }, hidden: { eq: false } } },
			id: true,
			title: true,
			options: { id: true, title: true, countSurveyAnswers: true, upperLimit: true }
		}),
		client.liveQuery.surveyAnswers({
			__args: {
				where: {
					user: { id: { eq: userId } },
					question: { conferenceId: { eq: conferenceId } }
				}
			},
			id: true,
			question: { id: true },
			option: { id: true, title: true }
		})
	]);
	return { questions, answers };
}
