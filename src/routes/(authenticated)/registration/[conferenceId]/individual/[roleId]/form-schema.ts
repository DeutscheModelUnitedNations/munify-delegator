import { z } from 'zod';

export const individualApplicationFormSchema = z.object({
	school: z.string().nullish(),
	motivation: z.string().nullish(),
	experience: z.string().nullish()
});
