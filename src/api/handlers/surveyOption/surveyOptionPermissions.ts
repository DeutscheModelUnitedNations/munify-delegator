import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isParticipantOfConference,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { assertCanManageSurveyQuestion } from '#api/handlers/surveyQuestion/surveyQuestionPermissions';

/** The abilities of survey options, which follow their question's. */
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
	// options of its conference's questions; creating one is `assertCanCreateSurveyOption`.
	abilityBuilder.surveyOption.allow(['read', 'update', 'delete']).when((ctx) => {
		const question = isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES });
		return question ? { where: { question } } : undefined;
	});
}

/**
 * Refuses (NOT_FOUND) unless the question exists in a conference where the caller holds
 * `manageParticipants` (project management and participant care).
 */
export async function assertCanCreateSurveyOption({
	ctx,
	questionId
}: {
	ctx: ApiContext;
	questionId: string;
}) {
	await assertCanManageSurveyQuestion({ ctx, questionId });
}
