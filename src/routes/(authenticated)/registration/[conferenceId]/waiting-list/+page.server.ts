import { client } from '$lib/api/rumbleClient/client';
import { fetchCurrentUser } from '$lib/api/currentUser';
import { nullFieldsToUndefined } from '$lib/helpers/nullFieldsToUndefined';
import { fail, message, superValidate } from 'sveltekit-superforms';
import type { Actions, PageServerLoad } from './$types';
import { zod4 } from 'sveltekit-superforms/adapters';
import { waitingListFormSchema } from './form-schema';
import { m } from '$lib/paraglide/messages';

export const load: PageServerLoad = async (event) => {
	const user = await fetchCurrentUser();

	const [waitingListEntry] = await client.query.waitingListEntries({
		__args: {
			where: {
				conferenceId: { eq: event.params.conferenceId },
				userId: { eq: user.sub }
			}
		},
		id: true,
		school: true,
		motivation: true,
		experience: true,
		requests: true,
		createdAt: true
	});

	const form = await superValidate(
		waitingListEntry ? nullFieldsToUndefined(waitingListEntry) : undefined,
		zod4(waitingListFormSchema)
	);

	return {
		form,
		alreadyOnWaitingList: !!waitingListEntry
	};
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod4(waitingListFormSchema));
		if (!form.valid) {
			return fail(400, { form });
		}
		await client.mutate.createWaitingListEntry({
			__args: { ...form.data, conferenceId: event.params.conferenceId },
			id: true
		});

		return message(form, m.saved());
	}
} satisfies Actions;
