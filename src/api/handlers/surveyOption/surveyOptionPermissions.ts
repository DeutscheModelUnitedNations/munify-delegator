import { type ApiContext, abilityBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRoleForSurveyQuestion,
	isParticipantOfConference,
	isTeamMemberOfConference,
	systemAdmin
} from '$api/services/authHelper';

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
	await assertTeamRoleForSurveyQuestion(ctx, questionId);
}

/** The option `id`, if the caller may update it: a where clause matching nothing otherwise. */
export async function updatableSurveyOptionWhere(ctx: ApiContext, id: string) {
	return (await ctx.abilities.surveyOption.filter('update')).merge({ where: { id } }).sql.where;
}

/** The option `id`, if the caller may delete it: a where clause matching nothing otherwise. */
export async function deletableSurveyOptionWhere(ctx: ApiContext, id: string) {
	return (await ctx.abilities.surveyOption.filter('delete')).merge({ where: { id } }).sql.where;
}
