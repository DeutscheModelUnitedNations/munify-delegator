import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	isParticipantOfConference,
	isTeamMemberOfConference,
	systemAdmin,
	teamConference
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

/** The abilities of survey questions. */
export function registerSurveyQuestionAbilities() {
	abilityBuilder.surveyQuestion.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participants read the published questions of their conferences - not drafts, and not the
	// ones the team hid.
	abilityBuilder.surveyQuestion.allow('read').when(
		liveWhere((args) => {
			const participant = isParticipantOfConference(args);
			return participant && { ...participant, draft: false, hidden: false };
		})
	);

	// Participant care (project management and participant care) reads, updates and deletes its
	// conference's questions; creating one is `assertCanCreateSurveyQuestion`.
	abilityBuilder.surveyQuestion
		.allow(['read', 'update', 'delete'])
		.when(
			liveWhere((args) => isTeamMemberOfConference({ ...args, roles: PARTICIPANT_CARE_ROLES }))
		);
}

/**
 * Refuses (FORBIDDEN) unless the caller holds `manageParticipants` (project management and
 * participant care) in the conference.
 */
export async function assertCanCreateSurveyQuestion({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}

/**
 * Refuses (NOT_FOUND) unless the question exists in a conference where the caller holds
 * `manageParticipants` (project management and participant care). For what goes under a question:
 * its options and the distribution of the unanswered. Returns the question's conference.
 */
export async function assertCanManageSurveyQuestion({
	ctx,
	questionId
}: {
	ctx: ApiContext;
	questionId: string;
}) {
	const question = await db.query.surveyQuestion.findFirst({
		where: {
			id: questionId,
			conference: await teamConference({ ctx, permission: 'manageParticipants' })
		},
		columns: { conferenceId: true }
	});
	if (!question) {
		throw apiError({ code: 'NOT_FOUND', message: m.surveyQuestionNotFound() });
	}
	return { conferenceId: question.conferenceId };
}
