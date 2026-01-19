import { z } from 'zod';

export const newPaperSchema = z.object({
	delegation: z.string(),
	committee: z.string().optional(),
	type: z.enum(['POSITION_PAPER', 'INTRODUCTION_PAPER']),
	agendaItemId: z.string(),
	content: z.json()
});
