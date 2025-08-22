import type { PageServerLoad } from './$types';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { graphql } from '$houdini';
import { error, type Actions } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
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
			contractContentSet
			guardianConsentContentSet
			mediaConsentContentSet
			termsAndConditionsContentSet
			certificateContentSet
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
			certificateContentSet
			termsAndConditionsContentSet
			mediaConsentContentSet
			guardianConsentContentSet
			contractContentSet
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
		certificateContentSet: conference.certificateContentSet,
		termsAndConditionsContentSet: conference.termsAndConditionsContentSet,
		mediaConsentContentSet: conference.mediaConsentContentSet,
		guardianConsentContentSet: conference.guardianConsentContentSet,
		contractContentSet: conference.contractContentSet
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
