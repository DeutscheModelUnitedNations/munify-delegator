import { client } from '$lib/api/rumbleClient/client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const conferenceId = event.params.conferenceId;

	const [conference, surveys] = await Promise.all([
		client.query.conference({ __args: { id: conferenceId }, timezone: true }),
		client.query.surveyQuestions({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { createdAt: 'desc' }
			},
			id: true,
			title: true,
			description: true,
			deadline: true,
			draft: true,
			hidden: true,
			showSelectionOnDashboard: true,
			options: {
				id: true,
				title: true,
				description: true,
				countSurveyAnswers: true,
				upperLimit: true
			}
		})
	]);

	return {
		surveys,
		conferenceId,
		conferenceTimezone: conference?.timezone ?? 'UTC'
	};
};
