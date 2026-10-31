import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isParticipantOfConference,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { assertTeamPermissionForSurveyQuestion } from '#api/handlers/surveyQuestion/surveyQuestionPermissions';

export function registerSurveyOptionAbilities() {
	abilityBuilder.surveyOption.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participants read the options of their conference's published (non-draft, not hidden)
	// questions.
	abilityBuilder.surveyOption.allow('read').when((ctx) => {
		const participant = isParticipantOfConference(ctx);
		return participant
			? { where: { question: { ...participant, draft: false, hidden: false } } }
			: undefined;
	});

	// Participant care (project management and participant care) reads, updates and deletes the
	// options of its conference's questions.
	abilityBuilder.surveyOption.allow(['read', 'update', 'delete']).when((ctx) => {
		const question = isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES });
		return question ? { where: { question } } : undefined;
	});
}

/** Refuses unless the caller is participant care in the question's conference. */
export async function assertCanCreateSurveyOption({
	ctx,
	questionId
}: {
	ctx: ApiContext;
	questionId: string;
}) {
	await assertTeamPermissionForSurveyQuestion({ ctx, questionId });
}
