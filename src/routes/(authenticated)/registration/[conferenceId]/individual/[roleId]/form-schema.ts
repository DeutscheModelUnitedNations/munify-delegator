import { z } from 'zod/v3';

export const individualApplicationFormSchema = z.object({
	school: z.string().nullish(),
	motivation: z.string().nullish(),
	experience: z.string().nullish()
});
