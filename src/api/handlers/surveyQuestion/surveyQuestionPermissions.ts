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
import { grantWhere } from '#api/services/authHelper/utils';
import type { TeamPermission } from '#lib/helpers/teamRoles';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

export function registerSurveyQuestionAbilities() {
	// Ported from abilities/entities/surveyQuestion.ts
	abilityBuilder.surveyQuestion.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participants see the published questions of their own conferences - not drafts, and not the
	// ones the organizers hid.
	abilityBuilder.surveyQuestion.allow('read').when((ctx) => {
		const participant = isParticipantOfConference(ctx);
		return participant ? { where: { ...participant, draft: false, hidden: false } } : undefined;
	});

	// Participant care and project management manage their conference's questions.
	// Creation is checked by `assertCanCreateSurveyQuestion`, as it was in the resolver under CASL.
	abilityBuilder.surveyQuestion
		.allow(['read', 'update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));
}

/** Refuses unless the caller may add questions to the conference's surveys. */
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
 * Refuses unless the survey question exists in a conference where the caller holds `permission`,
 * for what goes under a question (options, answers given for others).
 */
export async function assertTeamPermissionForSurveyQuestion({
	ctx,
	questionId,
	permission = 'manageParticipants'
}: {
	ctx: ApiContext;
	questionId: string;
	permission?: TeamPermission;
}) {
	const question = await db.query.surveyQuestion.findFirst({
		where: { id: questionId, conference: teamConference({ ctx, permission }) },
		columns: { conferenceId: true }
	});
	if (!question) {
		throw apiError({ code: 'NOT_FOUND', message: m.surveyQuestionNotFound() });
	}
}
