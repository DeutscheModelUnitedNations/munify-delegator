import { configPublic } from '$config/public';
import z from 'zod';

export const waitingListFormSchema = z.object({
	school: z.string().max(configPublic.PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH),
	motivation: z.string().max(configPublic.PUBLIC_MAX_APPLICATION_TEXT_LENGTH),
	experience: z.string().max(configPublic.PUBLIC_MAX_APPLICATION_TEXT_LENGTH),
	requests: z.optional(z.string().max(configPublic.PUBLIC_MAX_APPLICATION_TEXT_LENGTH).nullish())
});
