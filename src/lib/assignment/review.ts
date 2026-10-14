/** The arguments of `setAssignmentReview`, checked and turned into the row it writes. Pure. */

type Nullable<T> = T | null | undefined;

export interface ReviewInput {
	delegationId?: Nullable<string>;
	singleParticipantId?: Nullable<string>;
	evaluation?: Nullable<number>;
	flagged: boolean;
	disqualified: boolean;
	note?: Nullable<string>;
}

/** Why a review cannot be recorded: it names no or two applications, or a rating off the scale. */
export function reviewProblem(input: ReviewInput) {
	if (!input.delegationId === !input.singleParticipantId) return 'application' as const;
	const evaluation = input.evaluation ?? 2.5;
	if (evaluation < 0.5 || evaluation > 5) return 'evaluation' as const;
	return undefined;
}

/** The application a valid review is about, and the columns it sets. */
export function reviewRow(input: ReviewInput) {
	const application = input.delegationId
		? { kind: 'delegation' as const, id: input.delegationId }
		: { kind: 'single' as const, id: input.singleParticipantId ?? '' };
	return {
		application,
		keys: {
			delegationId: input.delegationId ?? null,
			singleParticipantId: input.singleParticipantId ?? null
		},
		values: {
			evaluation: input.evaluation ?? null,
			flagged: input.flagged,
			disqualified: input.disqualified,
			note: input.note || null
		}
	};
}
