import valiator from 'validator';
import { z } from 'zod';
import * as m from '$lib/paraglide/messages.js';

export const conferenceSettingsFormSchema = z.object({
	title: z.string().min(3, {
		message: m.atLeastXChars({ amount: 3 })
	}),
	longTitle: z
		.string()
		.min(5, {
			message: m.atLeastXChars({ amount: 5 })
		})
		.optional(),
	location: z
		.string()
		.min(3, {
			message: m.atLeastXChars({ amount: 3 })
		})
		.optional(),
	language: z
		.string()
		.min(2, {
			message: m.atLeastXChars({ amount: 2 })
		})
		.optional(),
	website: z
		.string()
		.refine((s) => valiator.isURL(s, { protocols: ['http', 'https'] }), {
			message: m.pleaseEnterAValidWebsite()
		})
		.optional(),
	imageDataUrl: z.string().optional(),
	startRegistration: z.date({
		message: m.pleaseEnterAValidDate()
	}),
	startAssignment: z.date({
		message: m.pleaseEnterAValidDate()
	}),
	startConference: z.date({
		message: m.pleaseEnterAValidDate()
	}),
	endConference: z.date({
		message: m.pleaseEnterAValidDate()
	})
});
