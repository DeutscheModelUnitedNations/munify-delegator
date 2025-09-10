import { z } from 'zod';

export const individualApplicationFormSchema = z.object({
	school: z.string().max(100).nullish(),
	motivation: z.string().max(500).nullish(),
	experience: z.string().max(500).nullish()
});
