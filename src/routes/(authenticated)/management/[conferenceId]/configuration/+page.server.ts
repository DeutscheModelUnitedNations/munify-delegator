import type { PageLoad } from './$types';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { graphql } from '$houdini';
import { error, type Actions } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages';
import { nullFieldsToUndefined } from '$lib/services/nullFieldsToUndefined';
import { conferenceSettingsFormSchema } from './form-schema';

const conferenceQuery = graphql(`
	query ConferenceFormPrepopulationQuery($id: String!) {
		findUniqueConference(where: { id: $id }) {
			title
			location
			longTitle
			startAssignment
			startConference
			startRegistration
			title
			website
			endConference
			imageDataUrl
			language
		}
	}
`);

const conferenceUpdate = graphql(`
	mutation UpdateConferenceFromFormMutation(
		$data: ConferenceUpdateDataInput!
		$where: ConferenceWhereUniqueInput!
	) {
		updateOneConference(data: $data, where: $where) {
			id
		}
	}
`);

export const load: PageLoad = async (event) => {
	const { data } = await conferenceQuery.fetch({
		event,
		variables: { id: event.params.conferenceId }
	});
	const conference = data?.findUniqueConference;

	if (!conference) {
		throw error(404, m.notFound());
	}

	const form = await superValidate(
		nullFieldsToUndefined(conference),
		zod(conferenceSettingsFormSchema)
	);

	return {
		form
	};
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod(conferenceSettingsFormSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		await conferenceUpdate.mutate(
			{
				data: form.data,
				where: {
					id: event.params.conferenceId
				}
			},
			{ event }
		);

		return message(form, m.saved());
	}
} satisfies Actions;