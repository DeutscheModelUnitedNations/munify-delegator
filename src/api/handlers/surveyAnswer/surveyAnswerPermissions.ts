import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	caredForVia,
	hop,
	hasTeamPermission,
	isOwnParticipation,
	participantIdsOf,
	systemAdmin
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { assertCanManageSurveyQuestion } from '#api/handlers/surveyQuestion/surveyQuestionPermissions';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';
import { assertFindFirstExists } from '@m1212e/rumble';

/** The abilities of survey answers. Answers are given through `upsertSurveyAnswer`. */
export function registerSurveyAnswerAbilities() {
	abilityBuilder.surveyAnswer.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Everybody reads their own answers, and changes or withdraws them until the question's deadline.
	abilityBuilder.surveyAnswer.allow('read').when(liveWhere(isOwnParticipation));
	abilityBuilder.surveyAnswer.allow(['update', 'delete']).when(
		liveWhere((args) =>
			hop(isOwnParticipation(args), (own) => ({
				...own,
				question: { deadline: { gt: new Date() } }
			}))
		)
	);

	// Participant care (project management and participant care) reads, updates and deletes the
	// answers to its conference's questions.
	abilityBuilder.surveyAnswer
		.allow(['read', 'update', 'delete'])
		.when(liveWhere((args) => caredForVia(args, 'question')));
}

/**
 * The option an answer picks, with its question, as far as the caller reads it: participants only
 * those of published (non-draft, not hidden) questions of their conferences, participant care every
 * one of its conference. Refuses (NOT_FOUND) any other.
 */
async function readableOption({ ctx, optionId }: { ctx: ApiContext; optionId: string }) {
	return db.query.surveyOption
		.findFirst({
			...(await ctx.abilities.surveyOption.filter('read')).merge({ where: { id: optionId } }).query
				.single,
			columns: { id: true, questionId: true, upperLimit: true },
			with: { question: { columns: { conferenceId: true, deadline: true } } }
		})
		.then(assertFindFirstExists);
}

/**
 * Refuses unless the caller reads the option (`readableOption`, NOT_FOUND) and may answer its
 * question for `userId` (by default themselves): everybody for themselves, participant care
 * (`manageParticipants`: project management and participant care) for anybody in its conference
 * (FORBIDDEN otherwise). Either way the person has to take part in the conference
 * (INVALID_INPUT). Returns the option, the person's participant row, and whether the option's
 * limits and the deadline apply: participant care may overfill an option and answer late.
 */
export async function assertCanAnswerSurvey({
	ctx,
	optionId,
	userId
}: {
	ctx: ApiContext;
	optionId: string;
	userId: string | null | undefined;
}) {
	const caller = ctx.mustBeLoggedIn().sub;
	const option = await readableOption({ ctx, optionId });
	const conferenceId = option.question.conferenceId;
	const subject = userId ?? caller;

	const ignoresLimits = await hasTeamPermission({
		ctx,
		conferenceId,
		permission: 'manageParticipants'
	});
	if (!ignoresLimits && subject !== caller) {
		throw apiError({ code: 'FORBIDDEN', message: m.surveyAnswerOnlyOwn() });
	}
	const participantIds = await participantIdsOf({ conferenceId, userIds: [subject] });
	const participantId = participantIds.get(subject);
	if (!participantId) {
		throw apiError({ code: 'INVALID_INPUT', message: m.usersNotInConference() });
	}
	return { option, participantId, ignoresLimits };
}

/**
 * Refuses (NOT_FOUND) unless the caller may delete the answer `userId` (by default the caller)
 * gave to the question (the delete ability: their own before the deadline, anybody's in its
 * conference for participant care). Returns it.
 */
export async function assertCanDeleteSurveyAnswer({
	ctx,
	questionId,
	userId
}: {
	ctx: ApiContext;
	questionId: string;
	userId: string | null | undefined;
}) {
	const subject = userId ?? ctx.mustBeLoggedIn().sub;
	const answer = await db.query.surveyAnswer.findFirst({
		...(await ctx.abilities.surveyAnswer.filter('delete')).merge({
			where: { questionId, participant: { userId: subject } }
		}).query.single,
		columns: { id: true, questionId: true }
	});
	if (!answer) throw apiError({ code: 'NOT_FOUND', message: m.deleteNotFoundOrForbidden() });
	return answer;
}

/**
 * Refuses (NOT_FOUND) unless the caller holds `manageParticipants` (project management and
 * participant care) in the question's conference, who may answer it for everybody who has not yet.
 */
export async function assertCanDistributeSurvey({
	ctx,
	questionId
}: {
	ctx: ApiContext;
	questionId: string;
}) {
	await assertCanManageSurveyQuestion({ ctx, questionId });
}
