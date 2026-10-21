import {
	PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH,
	PUBLIC_MAX_APPLICATION_TEXT_LENGTH
} from '$app/env/public';
import z from 'zod';

export const waitingListFormSchema = z.object({
	/** An existing school; `schoolName` names one to find or create instead. */
	schoolId: z.string().nullish(),
	schoolName: z.string().max(PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH).nullish(),
	motivation: z.string().max(PUBLIC_MAX_APPLICATION_TEXT_LENGTH),
	experience: z.string().max(PUBLIC_MAX_APPLICATION_TEXT_LENGTH),
	requests: z.optional(z.string().max(PUBLIC_MAX_APPLICATION_TEXT_LENGTH).nullish())
});
