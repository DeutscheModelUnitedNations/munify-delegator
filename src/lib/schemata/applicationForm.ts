import { PUBLIC_MAX_APPLICATION_TEXT_LENGTH } from '$app/env/public';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';
import { schoolNameSchema } from './schoolChoice';

/** A text an applicant writes (motivation, experience, requests). */
export const applicationTextSchema = z.string().max(PUBLIC_MAX_APPLICATION_TEXT_LENGTH, {
	error: () => m.applicationTextTooLong({ max: PUBLIC_MAX_APPLICATION_TEXT_LENGTH })
});

export const applicationFormSchema = z.object({
	/** An existing school; `schoolName` names one to find or create instead. */
	schoolId: z.string().nullish(),
	schoolName: schoolNameSchema,
	motivation: applicationTextSchema.nullish(),
	experience: applicationTextSchema.nullish()
});

/** The texts alone, which the dashboard edits apart from the applicant's own school. */
export const applicationTextsSchema = applicationFormSchema.pick({
	motivation: true,
	experience: true
});
