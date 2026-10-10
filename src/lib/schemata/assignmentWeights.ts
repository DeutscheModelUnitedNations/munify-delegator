import { z } from 'zod';
import { WISH_EFFECTS } from '$lib/assignment/autoAssign';

/** The weights the automatic assignment runs with; see `$lib/assignment/autoAssign`. */
export const assignmentWeightsSchema = z.object({
	nullRating: z.number().min(0.5).max(5),
	ratingFactor: z.number().min(0).max(100),
	markBonus: z.number().min(-100).max(100),
	markEffect: z.enum(WISH_EFFECTS),
	experienceModifier: z.number().min(-100).max(100),
	experienceEffect: z.enum(WISH_EFFECTS)
});
