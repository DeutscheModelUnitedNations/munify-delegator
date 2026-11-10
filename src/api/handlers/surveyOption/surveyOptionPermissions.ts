import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	caredForVia,
	hop,
	isParticipantOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { assertCanManageSurveyQuestion } from '#api/handlers/surveyQuestion/surveyQuestionPermissions';

/** The abilities of survey options, which follow their question's. */
export function registerSurveyOptionAbilities() {
	abilityBuilder.surveyOption.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participants read the options of their conference's published (non-draft, not hidden)
	// questions.
	abilityBuilder.surveyOption.allow('read').when(
		liveWhere((args) =>
			hop(isParticipantOfConference(args), (participant) => ({
				question: { ...participant, draft: false, hidden: false }
			}))
		)
	);

	// Participant care (project management and participant care) reads, updates and deletes the
	// options of its conference's questions; creating one is `assertCanCreateSurveyOption`.
	abilityBuilder.surveyOption
		.allow(['read', 'update', 'delete'])
		.when(liveWhere((args) => caredForVia(args, 'question')));
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
