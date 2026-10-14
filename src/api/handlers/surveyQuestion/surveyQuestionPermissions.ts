import { type ApiContext, abilityBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isParticipantOfConference,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';

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
		.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));
}

/** Refuses unless the caller may add questions to the conference's surveys. */
export async function assertCanCreateSurveyQuestion(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}

/** The question `id`, if the caller may update it: a where clause matching nothing otherwise. */
export async function updatableSurveyQuestionWhere(ctx: ApiContext, id: string) {
	return (await ctx.abilities.surveyQuestion.filter('update')).merge({ where: { id } }).sql.where;
}

/** The question `id`, if the caller may delete it: a where clause matching nothing otherwise. */
export async function deletableSurveyQuestionWhere(ctx: ApiContext, id: string) {
	return (await ctx.abilities.surveyQuestion.filter('delete')).merge({ where: { id } }).sql.where;
}
