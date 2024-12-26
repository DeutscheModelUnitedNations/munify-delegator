import type { PageServerLoad } from './$types';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { type Actions } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages';
import { conferenceCreationFormSchema } from './form-schema';

export const load: PageServerLoad = async (event) => {
	const form = await superValidate(zod(conferenceCreationFormSchema));

	return { form };
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod(conferenceCreationFormSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		// await conferenceUpdate.mutate(
		// 	{
		// 		data: form.data,
		// 		where: {
		// 			id: event.params.conferenceId
		// 		}
		// 	},
		// 	{ event }
		// );

		return message(form, m.saved());
	}
} satisfies Actions;
