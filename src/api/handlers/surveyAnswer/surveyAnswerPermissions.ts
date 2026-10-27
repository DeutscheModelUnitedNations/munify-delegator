import { db } from '#api/db/db.js';
import { type ApiContext, abilityBuilder } from '#api/rumble.js';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRoleForSurveyQuestion,
	hasTeamRole,
	isTeamMemberOfConference,
	participantIdsOf,
	systemAdmin,
	userId
} from '#api/services/authHelper.js';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '#api/services/errors/apiError.js';

export function registerSurveyAnswerAbilities() {
	// Ported from abilities/entities/surveyAnswer.ts
	abilityBuilder.surveyAnswer.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Users read and update their own answers, and take one back until the question's deadline,
	// after which answering is closed for them too.
	abilityBuilder.surveyAnswer.allow(['read', 'update']).when((ctx) => {
		const id = userId(ctx);
		return id ? { where: { participant: { userId: id } } } : undefined;
	});
	abilityBuilder.surveyAnswer.allow('delete').when((ctx) => {
		const id = userId(ctx);
		return id
			? {
					where: {
						participant: { userId: id },
						question: { deadline: { gt: new Date() } }
					}
				}
			: undefined;
	});

	// Participant care and project management manage their conference's answers.
	abilityBuilder.surveyAnswer.allow(['read', 'update', 'delete']).when((ctx) => {
		const question = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
		return question ? { where: { question } } : undefined;
	});
}

/** The option an answer picks, as far as deciding who may give it goes. */
interface AnsweredOption {
	questionId: string;
	question: { conferenceId: string };
}

/**
 * Who an answer may be given for: participant care answers for anybody in its conference, and
 * everybody else only for themselves, in a conference they take part in. Returns the participant
 * row the answer belongs to, and whether the caller answers as participant care - organizers may
 * overfill an option and answer past the deadline; participants may not.
 */
async function answeringFor(
	ctx: ApiContext,
	option: AnsweredOption,
	requestedUserId: string | null | undefined
) {
	const caller = ctx.mustBeLoggedIn().sub;
	const conferenceId = option.question.conferenceId;
	const subject = requestedUserId ?? caller;

	const ignoresLimits = await hasTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
	if (!ignoresLimits && subject !== caller) {
		throw apiError('FORBIDDEN', m.surveyAnswerOnlyOwn());
	}
	const participantIds = await participantIdsOf(conferenceId, [subject]);
	const subjectParticipantId = participantIds.get(subject);
	if (!subjectParticipantId) {
		throw apiError('INVALID_INPUT', m.usersNotInConference());
	}
	return { subjectParticipantId, ignoresLimits };
}

/**
 * Whom an answer is for, checked: the user it names, or, addressed by id alone, whoever the
 * answer already belongs to. The question it names has to be the option's.
 */
async function answerSubject(
	ctx: ApiContext,
	option: AnsweredOption,
	args: { id?: string | null; questionId?: string | null; userId?: string | null }
) {
	if (args.questionId && args.questionId !== option.questionId) {
		throw apiError('INVALID_INPUT', m.surveyAnswerOptionOtherQuestion());
	}
	const addressed = args.id
		? await db.query.surveyAnswer.findFirst({
				...(await ctx.abilities.surveyAnswer.filter('update')).merge({ where: { id: args.id } })
					.query.single,
				columns: {},
				with: { participant: { columns: { userId: true } } }
			})
		: undefined;
	return answeringFor(ctx, option, args.userId ?? addressed?.participant.userId);
}

/**
 * Refuses unless the caller may give the answer `option` stands for. Returns whom it is for (their
 * participant row in the question's conference), whether the option's limits apply to the caller,
 * and the caller's answer to replace, if there is one they may update.
 */
export async function assertCanAnswerSurvey(
	ctx: ApiContext,
	option: AnsweredOption,
	args: { id?: string | null; questionId?: string | null; userId?: string | null }
) {
	const { subjectParticipantId, ignoresLimits } = await answerSubject(ctx, option, args);

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
 * Refuses unless the caller may take back the answer `userId` (by default the caller) gave to the
 * question (the row's delete ability). Returns it.
 */
export async function assertCanDeleteSurveyAnswer(
	ctx: ApiContext,
	args: { questionId: string; userId?: string | null }
) {
	const subject = args.userId ?? ctx.mustBeLoggedIn().sub;
	const answer = await db.query.surveyAnswer.findFirst({
		...(await ctx.abilities.surveyAnswer.filter('delete')).merge({
			where: { questionId: args.questionId, participant: { userId: subject } }
		}).query.single,
		columns: { id: true, questionId: true }
	});
	if (!answer) throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
	return answer;
}

/** Refuses unless the caller may answer the question for everybody who has not yet. */
export async function assertCanDistributeSurvey(ctx: ApiContext, questionId: string) {
	await assertTeamRoleForSurveyQuestion(ctx, questionId);
}
