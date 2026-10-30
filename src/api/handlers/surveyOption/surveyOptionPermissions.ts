import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isParticipantOfConference,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { assertTeamPermissionForSurveyQuestion } from '#api/handlers/surveyQuestion/surveyQuestionPermissions';

export function registerSurveyOptionAbilities() {
	// Ported from abilities/entities/surveyOption.ts
	abilityBuilder.surveyOption.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participants see the options of the questions they may see.
	abilityBuilder.surveyOption.allow('read').when((ctx) => {
		const participant = isParticipantOfConference(ctx);
		return participant
			? { where: { question: { ...participant, draft: false, hidden: false } } }
			: undefined;
	});

	// Scoped through the question, which carries the conference.
	abilityBuilder.surveyOption.allow(['read', 'update', 'delete']).when((ctx) => {
		const question = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
		return question ? { where: { question } } : undefined;
	});
}

/** Refuses unless the caller may add options to the question. */
export async function assertCanCreateSurveyOption(ctx: ApiContext, questionId: string) {
	await assertTeamPermissionForSurveyQuestion(ctx, questionId);
}
