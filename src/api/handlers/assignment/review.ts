import { z } from 'zod';
import { m } from '#lib/paraglide/messages';

/** A flag is never null in the table: null leaves it as it is, like undefined. */
const flagChange = z
	.boolean()
	.nullish()
	.transform((flag) => flag ?? undefined);

/**
 * The arguments of `upsertAssignmentReview`, checked and turned into the columns it writes. Only
 * the fields given are changed; `null` clears the rating or the note.
 */
export const reviewArgsSchema = z
	.object({
		delegationId: z.string().nullish(),
		singleParticipantId: z.string().nullish(),
		evaluation: z
			.number()
			.min(0.5, { error: () => m.assignmentReviewRatingRange() })
			.max(5, { error: () => m.assignmentReviewRatingRange() })
			.nullish(),
		flagged: flagChange,
		disqualified: flagChange,
		/** Must get a seat. */
		required: flagChange,
		note: z
			.string()
			.nullish()
			.transform((note) => (note === undefined ? undefined : note || null))
	})
	.refine((args) => !args.delegationId !== !args.singleParticipantId, {
		error: () => m.assignmentReviewNameOneApplication()
	})
	.refine((args) => !(args.disqualified && args.required), {
		error: () => m.assignmentReviewRequiredAndExcluded()
	})
	.transform(({ delegationId, singleParticipantId, ...changes }) => ({
		application: delegationId
			? { kind: 'delegation' as const, id: delegationId }
			: { kind: 'single' as const, id: singleParticipantId ?? '' },
		keys: { delegationId: delegationId ?? null, singleParticipantId: singleParticipantId ?? null },
		changes
	}));

export type ReviewUpdate = z.output<typeof reviewArgsSchema>;
export type ReviewedApplication = ReviewUpdate['application'];
