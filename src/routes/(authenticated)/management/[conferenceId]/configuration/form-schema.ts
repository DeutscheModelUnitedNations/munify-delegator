import valiator from 'validator';
import { z } from 'zod';
import * as m from '$lib/paraglide/messages.js';

export const conferenceSettingsFormSchema = z.object({
	title: z.string().min(3, {
		message: m.atLeastXChars({ amount: 3 })
	}),
	info: z.string().optional().nullable(),
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
	image: z
		.instanceof(File)
		.refine((f) => f.size < 1_000_000, 'Max 1mb upload size.')
		.optional(),
	startAssignment: z.date({
		message: m.pleaseEnterAValidDate()
	}),
	startConference: z.date({
		message: m.pleaseEnterAValidDate()
	}),
	endConference: z.date({
		message: m.pleaseEnterAValidDate()
	}),
	state: z.union([
		z.literal('PRE'),
		z.literal('PARTICIPANT_REGISTRATION'),
		z.literal('PREPARATION'),
		z.literal('ACTIVE'),
		z.literal('POST')
	])
});
