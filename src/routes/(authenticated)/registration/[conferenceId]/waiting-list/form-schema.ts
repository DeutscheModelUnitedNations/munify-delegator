import {
	PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH,
	PUBLIC_MAX_APPLICATION_TEXT_LENGTH
} from '$app/env/public';
import z from 'zod';

export const waitingListFormSchema = z.object({
	school: z.string().max(PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH),
	motivation: z.string().max(PUBLIC_MAX_APPLICATION_TEXT_LENGTH),
	experience: z.string().max(PUBLIC_MAX_APPLICATION_TEXT_LENGTH),
	requests: z.optional(z.string().max(PUBLIC_MAX_APPLICATION_TEXT_LENGTH).nullish())
});
