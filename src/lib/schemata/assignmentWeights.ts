import { z } from 'zod';
import { WISH_EFFECTS } from '#lib/assignment/weights';

/** The weights the automatic assignment runs with; see `#lib/assignment/weights`. */
export const assignmentWeightsSchema = z.object({
	nullRating: z.number().min(0.5).max(5),
	ratingFactor: z.number().min(0).max(100),
	markBonus: z.number().min(-100).max(100),
	markEffect: z.enum(WISH_EFFECTS),
	experienceModifier: z.number().min(-100).max(100),
	experienceEffect: z.enum(WISH_EFFECTS)
});

const { shape } = assignmentWeightsSchema;

/** The same limits for `upsertAssignmentWeights`, where a weight left out or null stays as it is. */
export const assignmentWeightsArgsSchema = z.object({
	nullRating: shape.nullRating.nullish(),
	ratingFactor: shape.ratingFactor.nullish(),
	markBonus: shape.markBonus.nullish(),
	markEffect: shape.markEffect.nullish(),
	experienceModifier: shape.experienceModifier.nullish(),
	experienceEffect: shape.experienceEffect.nullish()
});
