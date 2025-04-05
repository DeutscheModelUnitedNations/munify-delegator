import type { PageServerLoad } from './$types';
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
			state
			website
			endConference
			imageDataURL
			language
			linkToPreparationGuide
			linkToPaperInbox
			info
			unlockPayments
			unlockPostals
			feeAmount
			bic
			currency
			bankName
			iban
			accountHolder
			postalName
			postalStreet
			postalApartment
			postalZip
			postalCity
			postalCountry
			contractContent
			guardianConsentContent
			mediaConsentContent
			termsAndConditionsContent
			certificateContent
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

export const load: PageServerLoad = async (event) => {
	const { data } = await conferenceQuery.fetch({
		event,
		variables: { id: event.params.conferenceId },
		blocking: true
	});
	const conference = data?.findUniqueConference;

	if (!conference) {
		throw error(404, m.notFound());
	}

	const form = await superValidate(
		nullFieldsToUndefined(conference) as any,
		zod(conferenceSettingsFormSchema)
	);

	return {
		form,
		imageDataURL: conference.imageDataURL,
		contractContent: conference.contractContent,
		guardianConsentContent: conference.guardianConsentContent,
		mediaConsentContent: conference.mediaConsentContent,
		termsAndConditionsContent: conference.termsAndConditionsContent,
		certificateContent: conference.certificateContent
	};
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod(conferenceSettingsFormSchema));
		if (!form.valid) {
			return fail(400, { form });
		}
		console.log(form.data);
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
