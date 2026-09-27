import { client } from '$lib/api/rumbleClient/client';
import type { Actions, PageServerLoad } from './$types';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { m } from '$lib/paraglide/messages';
import { fail } from '@sveltejs/kit';
import { AddAgendaItemFormSchema } from './form-schema';

export const load: PageServerLoad = async (event) => {
	const committees = await client.query.committees({
		__args: { where: { conferenceId: { eq: event.params.conferenceId } } },
		id: true,
		abbreviation: true,
		name: true,
		numOfSeatsPerDelegation: true,
		resolutionHeadline: true,
		nations: { alpha2Code: true, alpha3Code: true },
		agendaItems: {
			id: true,
			title: true,
			teaserText: true,
			papers: { id: true }
		}
	});

	const addAgendaItemForm = await superValidate(zod4(AddAgendaItemFormSchema));

	return { committees, addAgendaItemForm };
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod4(AddAgendaItemFormSchema));
		if (!form.valid) {
			return fail(400, { form });
		}
		await client.mutate.createAgendaItem({
			__args: { ...form.data, teaserText: form.data.teaserText || undefined },
			id: true
		});

		return message(form, m.saved());
	}
} satisfies Actions;
