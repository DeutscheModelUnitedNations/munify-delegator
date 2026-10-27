import {
	PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH,
	PUBLIC_MAX_APPLICATION_TEXT_LENGTH
} from '$app/env/public';
import { z } from 'zod';

export const applicationFormSchema = z.object({
	/** An existing school; `schoolName` names one to find or create instead. */
	schoolId: z.string().nullish(),
	schoolName: z.string().max(PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH).nullish(),
	motivation: z.string().max(PUBLIC_MAX_APPLICATION_TEXT_LENGTH).nullish(),
	experience: z.string().max(PUBLIC_MAX_APPLICATION_TEXT_LENGTH).nullish()
});

/** The texts alone, which the dashboard edits apart from the applicant's own school. */
export const applicationTextsSchema = applicationFormSchema.pick({
	motivation: true,
	experience: true
});
