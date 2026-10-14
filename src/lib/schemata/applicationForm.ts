import {
	PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH,
	PUBLIC_MAX_APPLICATION_TEXT_LENGTH
} from '$app/env/public';
import { z } from 'zod';

export const applicationFormSchema = z.object({
	school: z.string().max(PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH).nullish(),
	motivation: z.string().max(PUBLIC_MAX_APPLICATION_TEXT_LENGTH).nullish(),
	experience: z.string().max(PUBLIC_MAX_APPLICATION_TEXT_LENGTH).nullish()
});
