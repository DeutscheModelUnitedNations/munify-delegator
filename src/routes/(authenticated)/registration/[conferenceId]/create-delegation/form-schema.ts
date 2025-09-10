import { z } from 'zod';

export const createDelegationFormSchema = z.object({
	school: z.string().max(100).nullish(),
	motivation: z.string().max(500).nullish(),
	experience: z.string().max(500).nullish()
});
