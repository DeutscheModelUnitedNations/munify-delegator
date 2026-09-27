import type { Actions, PageServerLoad } from './$types';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { client } from '$lib/api/rumbleClient/client';
import { redirect } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import { applicationFormSchema } from '$lib/schemata/applicationForm';

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();

	// An existing application prefills the form, so the participant can amend it.
	const [existing, role] = await Promise.all([
		client.query
			.singleParticipants({
				__args: {
					where: {
						conferenceId: { eq: event.params.conferenceId },
						userId: { eq: user.sub }
					}
				},
				id: true,
				experience: true,
				motivation: true,
				school: true
			})
			.then((rows) => rows.at(0)),
		client.query.customConferenceRole({ __args: { id: event.params.roleId }, name: true })
	]);

	const form = await superValidate(existing, zod4(applicationFormSchema));

	return {
		form,
		conferenceId: event.params.conferenceId,
		origin: event.url.origin,
		role
	};
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod4(applicationFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		await client.mutate.createSingleParticipant({
			__args: {
				...form.data,
				conferenceId: event.params.conferenceId,
				roleId: event.params.roleId
			},
			id: true
		});
		redirect(302, `/dashboard`);
		return message(form, m.saved());
	}
} satisfies Actions;
