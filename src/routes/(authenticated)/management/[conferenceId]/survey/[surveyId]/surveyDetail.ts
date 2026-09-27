import { client } from '$lib/api/rumbleClient/client';

const answeringUser = { id: true, givenName: true, familyName: true } as const;

/** One survey with its options and answers, plus everyone who still owes an answer. */
export async function fetchSurveyDetail(conferenceId: string, surveyId: string) {
	/** Anyone who holds a seat but has not answered this question yet. */
	const notAnswered = { NOT: { surveyAnswers: { questionId: { eq: surveyId } } } };

	const [conference, survey, delegationMembers, singleParticipants] = await Promise.all([
		client.liveQuery.conference({ __args: { id: conferenceId }, timezone: true }),
		client.liveQuery.surveyQuestion({
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
		client.liveQuery.delegationMembers({
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
		client.liveQuery.singleParticipants({
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
		conferenceTimezone: conference?.timezone ?? 'UTC'
	};
}
