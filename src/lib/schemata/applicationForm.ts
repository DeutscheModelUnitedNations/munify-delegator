import { configPublic } from '$config/public';
import { z } from 'zod';

export const applicationFormSchema = z.object({
	school: z.string().max(configPublic.PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH).nullish(),
	motivation: z.string().max(configPublic.PUBLIC_MAX_APPLICATION_TEXT_LENGTH).nullish(),
	experience: z.string().max(configPublic.PUBLIC_MAX_APPLICATION_TEXT_LENGTH).nullish()
});
