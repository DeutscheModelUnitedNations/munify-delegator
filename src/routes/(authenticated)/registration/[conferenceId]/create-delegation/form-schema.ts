import { z } from 'zod';

export const createDelegationFormSchema = z.object({
	school: z.string().nullish(),
	motivation: z.string().nullish(),
	experience: z.string().nullish()
});
