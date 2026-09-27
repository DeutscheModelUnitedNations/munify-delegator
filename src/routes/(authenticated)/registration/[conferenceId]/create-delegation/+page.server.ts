import type { Actions, PageServerLoad } from './$types';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { client } from '$lib/api/rumbleClient/client';

import { m } from '$lib/paraglide/messages';
import { applicationFormSchema } from '$lib/schemata/applicationForm';

export const load: PageServerLoad = async (event) => {
	const form = await superValidate(zod4(applicationFormSchema));
	return { form, conferenceId: event.params.conferenceId, origin: event.url.origin };
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod4(applicationFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const delegation = await client.mutate.createDelegation({
			__args: { ...form.data, conferenceId: event.params.conferenceId },
			id: true,
			entryCode: true
		});
		return { form: message(form, m.saved()), delegation };
	}
} satisfies Actions;
