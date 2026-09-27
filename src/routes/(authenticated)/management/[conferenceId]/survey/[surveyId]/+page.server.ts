import { client } from '$lib/api/rumbleClient/client';
import type { PageServerLoad } from './$types';

const answeringUser = { id: true, givenName: true, familyName: true } as const;

export const load: PageServerLoad = async (event) => {
	const { conferenceId, surveyId } = event.params;
	/** Anyone who holds a seat but has not answered this question yet. */
	const notAnswered = { NOT: { surveyAnswers: { questionId: { eq: surveyId } } } };

	const [conference, survey, delegationMembers, singleParticipants] = await Promise.all([
		client.query.conference({ __args: { id: conferenceId }, timezone: true }),
		client.query.surveyQuestion({
			__args: { id: surveyId },
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
			},
			surveyAnswers: {
				id: true,
				createdAt: true,
				option: { id: true },
				user: answeringUser
			}
		}),
		client.query.delegationMembers({
			__args: {
				where: {
					conferenceId: { eq: conferenceId },
					delegation: {
						OR: [
							{ assignedNationAlpha3Code: { isNotNull: true } },
							{ assignedNonStateActorId: { isNotNull: true } }
						]
					},
					user: notAnswered
				}
			},
			user: answeringUser
		}),
		client.query.singleParticipants({
			__args: {
				where: {
					conferenceId: { eq: conferenceId },
					assignedRoleId: { isNotNull: true },
					user: notAnswered
				}
			},
			user: answeringUser
		})
	]);

	// Somebody can hold both kinds of registration, so the two lists are deduplicated by user.
	const byId = new Map(
		[...delegationMembers, ...singleParticipants].map((row) => [row.user.id, row.user])
	);

	return {
		survey,
		usersNotAnswered: [...byId.values()],
		conferenceId,
		surveyId,
		conferenceTimezone: conference?.timezone ?? 'UTC'
	};
};
