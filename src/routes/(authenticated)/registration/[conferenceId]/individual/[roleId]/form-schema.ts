import { z } from 'zod';
import * as m from '$lib/paraglide/messages.js';

export const individualApplicationFormSchema = z.object({
	school: z.string().min(5, {
		message: m.atLeastXChars({ amount: 5 })
	}),
	motivation: z.string().min(50, {
		message: m.atLeastXChars({ amount: 50 })
	}),
	experience: z.string().min(5, {
		message: m.atLeastXChars({ amount: 5 })
	})
});
