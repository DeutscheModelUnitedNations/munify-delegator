import { z } from 'zod';
import { PaperType } from '@prisma/client';

export const newPaperSchema = z.object({
	delegation: z.string(),
	committee: z.string().optional(),
	type: z.enum(PaperType),
	agendaItemId: z.string(),
	content: z.json()
});
