import { z } from 'zod';

export const createDelegationFormSchema = z.object({
	school: z.string().optional().nullable(),
	motivation: z.string().optional().nullable(),
	experience: z.string().optional().nullable()
});
