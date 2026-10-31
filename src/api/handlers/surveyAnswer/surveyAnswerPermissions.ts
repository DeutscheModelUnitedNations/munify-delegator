import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	hasTeamPermission,
	isTeamMemberOfConference,
	participantIdsOf,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import { assertTeamPermissionForSurveyQuestion } from '#api/handlers/surveyQuestion/surveyQuestionPermissions';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

export function registerSurveyAnswerAbilities() {
	abilityBuilder.surveyAnswer.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Everybody reads their own answers, and changes or withdraws them until the question's deadline.
	abilityBuilder.surveyAnswer.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { participant: { userId: id } } } : undefined;
	});
	abilityBuilder.surveyAnswer.allow(['update', 'delete']).when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						participant: { userId: id },
						question: { deadline: { gt: new Date() } }
					}
				}
			: undefined;
	});

	// Participant care (project management and participant care) reads, updates and deletes the
	// answers to its conference's questions.
	abilityBuilder.surveyAnswer.allow(['read', 'update', 'delete']).when((ctx) => {
		const question = isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES });
		return question ? { where: { question } } : undefined;
	});
}

/** The option an answer picks, with what deciding who may give it needs. */
interface AnsweredOption {
	questionId: string;
	question: { conferenceId: string };
}

/**
 * Refuses unless the caller may answer for `requestedUserId` (by default themselves): participant
 * care for anybody in its conference, everybody else only for themselves; either way the subject
 * has to take part in the conference. Returns the subject's participant row and whether the caller
 * answers as participant care, who may overfill an option and answer past the deadline.
 */
async function assertCanAnswerFor({
	ctx,
	option,
	requestedUserId
}: {
	ctx: ApiContext;
	option: AnsweredOption;
	requestedUserId: string | null | undefined;
}) {
	const caller = ctx.mustBeLoggedIn().sub;
	const conferenceId = option.question.conferenceId;
	const subject = requestedUserId ?? caller;

	const ignoresLimits = await hasTeamPermission({
		ctx,
		conferenceId,
		permission: 'manageParticipants'
	});
	if (!ignoresLimits && subject !== caller) {
		throw apiError({ code: 'FORBIDDEN', message: m.surveyAnswerOnlyOwn() });
	}
	const participantIds = await participantIdsOf({ conferenceId, userIds: [subject] });
	const subjectParticipantId = participantIds.get(subject);
	if (!subjectParticipantId) {
		throw apiError({ code: 'INVALID_INPUT', message: m.usersNotInConference() });
	}
	return { subjectParticipantId, ignoresLimits };
}

/**
 * Whom an answer is for: the user it names, or, addressed by id alone, whoever the answer already
 * belongs to - checked by `assertCanAnswerFor`. Refuses a question that is not the option's.
 */
async function answerSubject({
	ctx,
	option,
	args
}: {
	ctx: ApiContext;
	option: AnsweredOption;
	args: { id?: string | null; questionId?: string | null; userId?: string | null };
}) {
	if (args.questionId && args.questionId !== option.questionId) {
		throw apiError({ code: 'INVALID_INPUT', message: m.surveyAnswerOptionOtherQuestion() });
	}
	const addressed = args.id
		? await db.query.surveyAnswer.findFirst({
				...(await ctx.abilities.surveyAnswer.filter('update')).merge({ where: { id: args.id } })
					.query.single,
				columns: {},
				with: { participant: { columns: { userId: true } } }
			})
		: undefined;
	return assertCanAnswerFor({
		ctx,
		option,
		requestedUserId: args.userId ?? addressed?.participant.userId
	});
}

/**
 * Refuses unless the caller may give the answer `option` stands for, for themselves or, as
 * participant care, for someone else. Returns whom it is for (their
 * participant row in the question's conference), whether the option's limits apply to the caller,
 * and the caller's answer to replace, if there is one they may update.
 */
export async function assertCanAnswerSurvey({
	ctx,
	option,
	args
}: {
	ctx: ApiContext;
	option: AnsweredOption;
	args: { id?: string | null; questionId?: string | null; userId?: string | null };
}) {
	const { subjectParticipantId, ignoresLimits } = await answerSubject({ ctx, option, args });

	const subjectsAnswer = {
		questionId: option.questionId,
		conferenceParticipantId: subjectParticipantId
	};
	const existing = await db.query.surveyAnswer.findFirst({
		...(await ctx.abilities.surveyAnswer.filter('update')).merge({
			where: args.id ? { id: args.id, ...subjectsAnswer } : subjectsAnswer
		}).query.single,
		columns: { id: true }
	});

	return { subjectParticipantId, ignoresLimits, updatableAnswerId: existing?.id };
}

/**
 * Refuses (NOT_FOUND) unless the caller may delete the answer `userId` (by default the caller)
 * gave to the question: their own before the deadline, or anybody's as participant care. Returns
 * it.
 */
export async function assertCanDeleteSurveyAnswer({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: { questionId: string; userId?: string | null };
}) {
	const subject = args.userId ?? ctx.mustBeLoggedIn().sub;
	const answer = await db.query.surveyAnswer.findFirst({
		...(await ctx.abilities.surveyAnswer.filter('delete')).merge({
			where: { questionId: args.questionId, participant: { userId: subject } }
		}).query.single,
		columns: { id: true, questionId: true }
	});
	if (!answer) throw apiError({ code: 'NOT_FOUND', message: m.deleteNotFoundOrForbidden() });
	return answer;
}

/**
 * Refuses unless the caller is participant care in the question's conference, who may answer it
 * for everybody who has not yet.
 */
export async function assertCanDistributeSurvey({
	ctx,
	questionId
}: {
	ctx: ApiContext;
	questionId: string;
}) {
	await assertTeamPermissionForSurveyQuestion({ ctx, questionId });
}
