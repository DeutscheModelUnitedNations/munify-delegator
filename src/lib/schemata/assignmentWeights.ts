import { z } from 'zod';

/** The weights the automatic assignment runs with; see `$lib/assignment/autoAssign`. */
export const assignmentWeightsSchema = z.object({
	nullRating: z.number().min(0.5).max(5),
	ratingFactor: z.number().min(0).max(100),
	markBonus: z.number().min(-100).max(100),
	nonWishMalus: z.number().min(0).max(1000)
});
