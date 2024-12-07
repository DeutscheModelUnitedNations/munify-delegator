import type { PageServerLoad } from './$houdini';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { graphql } from '$houdini';
import { type Actions } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages';
import { createDelegationFormSchema } from './form-schema';

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
	const form = await superValidate(zod(createDelegationFormSchema));
	return { form, conferenceId: event.params.conferenceId, origin: event.url.origin };
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod(createDelegationFormSchema));
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
