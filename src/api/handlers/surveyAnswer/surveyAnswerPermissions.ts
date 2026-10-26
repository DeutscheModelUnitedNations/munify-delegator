import { db } from '#api/db/db.js';
import { type ApiContext, abilityBuilder } from '#api/rumble.js';
import {
	PARTICIPANT_CARE_ROLES,
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

	// Users read and update their own answers (no delete, matching the CASL rule).
	abilityBuilder.surveyAnswer.allow(['read', 'update']).when((ctx) => {
		const id = userId(ctx);
		return id ? { where: { participant: { userId: id } } } : undefined;
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
