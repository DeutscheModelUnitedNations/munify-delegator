import { z } from 'zod/v4';

export const createDelegationFormSchema = z.object({
	school: z.string().nullish(),
	motivation: z.string().nullish(),
	experience: z.string().nullish()
});
