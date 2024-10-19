import valiator from 'validator';
import { z } from 'zod';
import * as m from '$lib/paraglide/messages.js';

export const userFormSchema = z.object({
	// must be at least 13 years old
	birthday: z.date().min(new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000)),
	phone: z
		.string()
		.refine((s) => valiator.isMobilePhone(s, "any", { strictMode: true }), {
			message: m.pleaseEnterAValidPhoneNumber()
		}),
	street: z.string().min(3),
	apartment: z.string().optional(),
	zip: z.string().min(4),
	city: z.string().min(3),
	country: z.string().refine(valiator.isISO31661Alpha2),
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
