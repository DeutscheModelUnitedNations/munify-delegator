import valiator from 'validator';
import { z } from 'zod';

export const userFormSchema = z.object({
	// must be at least 13 years old
	birthday: z.date().max(new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000)),
	phone: z.string().refine(valiator.isMobilePhone),
	street: z.string().min(3),
	apartment: z.string().optional(),
	zip: z.string().min(4),
	city: z.string().min(3),
	country: z.string().refine(valiator.isISO31661Alpha3),
	gender: z
		.string()
		.min(1)
		.max(1)
		.refine((s) => ['m', 'f', 'd', 'n'].includes(s)),
	pronouns: z.string().min(3),
	foodPreference: z.string().refine((s) => ['OMNIVORE', 'VEGETARIAN', 'VEGAN'].includes(s)),
	wantsToReceiveGeneralInformation: z.boolean().default(false),
	wantsJoinTeamInformation: z.boolean().default(false)
});
