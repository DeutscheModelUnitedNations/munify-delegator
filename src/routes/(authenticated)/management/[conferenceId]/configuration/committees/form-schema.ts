import z from 'zod';

export const AddAgendaItemFormSchema = z.object({
	committeeId: z.string().nonempty(),
	title: z.string().nonempty(),
	teaserText: z.string().optional()
});
