import { z } from 'zod';

export const newResolutionSchema = z.object({
	delegation: z.string(),
	committee: z.string().optional(),
	agendaItemId: z.string(),
	content: z.json()
});
