import type { PageServerLoad } from './$houdini';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { graphql } from '$houdini';
import { type Actions } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import { applicationFormSchema } from '$lib/schemata/applicationForm';

const createDelegation = graphql(`
	mutation CreateDelegationFromFormMutation(
		$conferenceId: ID!
		$motivation: String
		$experience: String
		$school: String
	) {
		createOneDelegation(
			conferenceId: $conferenceId
			experience: $experience
			motivation: $motivation
			school: $school
		) {
			id
			entryCode
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const form = await superValidate(zod4(applicationFormSchema));
	return { form, conferenceId: event.params.conferenceId, origin: event.url.origin };
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod4(applicationFormSchema));

		console.log(form);

		if (!form.valid) {
			return fail(400, { form });
		}

		const ret = await createDelegation.mutate(
			{
				...form.data,
				conferenceId: event.params.conferenceId!
			},
			{ event }
		);
		return { form: message(form, m.saved()), delegation: ret.data!.createOneDelegation! };
	}
} satisfies Actions;
