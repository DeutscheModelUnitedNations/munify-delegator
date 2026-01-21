import type { PageServerLoad } from './$types';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { cache, graphql } from '$houdini';
import { error, type Actions } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import { nullFieldsToUndefined } from '$lib/services/nullFieldsToUndefined';
import { conferenceSettingsFormSchema } from './form-schema';
import { AddAgendaItemFormSchema } from './committees/form-schema';
import dayjs from 'dayjs';

const conferenceQuery = graphql(`
	query ConferenceFormPrepopulationQuery($id: String!) {
		findUniqueConference(where: { id: $id }) {
			title
			location
			longTitle
			startAssignment
			registrationDeadlineGracePeriodMinutes
			startConference
			state
			website
			endConference
			imageDataURL
			emblemDataURL
			language
			linkToPreparationGuide
			linkToTeamWiki
			linkToServicesPage
			isOpenPaperSubmission
			info
			showInfoExpanded
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

const ConfigurationCommitteesQuery = graphql(`
	query ConfigurationCommitteesQuery($conferenceId: String!) {
		findManyCommittees(where: { conferenceId: { equals: $conferenceId } }) {
			id
			abbreviation
			name
			numOfSeatsPerDelegation
			resolutionHeadline
			nations {
				alpha2Code
				alpha3Code
			}
			agendaItems {
				id
				title
				teaserText
				papers {
					id
				}
			}
		}
	}
`);

const AddAgendaItemMutation = graphql(`
	mutation AddAgendaItemMutationConfig(
		$committeeId: String!
		$title: String!
		$teaserText: String
	) {
		createOneAgendaItem(
			data: { committeeId: $committeeId, title: $title, teaserText: $teaserText }
		) {
			id
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const [conferenceResult, committeesResult] = await Promise.all([
		conferenceQuery.fetch({
			event,
			variables: { id: event.params.conferenceId },
			blocking: true
		}),
		ConfigurationCommitteesQuery.fetch({
			event,
			variables: { conferenceId: event.params.conferenceId },
			blocking: true
		})
	]);

	const conference = conferenceResult.data?.findUniqueConference;

	if (!conference) {
		throw error(404, m.notFound());
	}

	const form = await superValidate(
		nullFieldsToUndefined(conference) as any,
		zod4(conferenceSettingsFormSchema)
	);

	const addAgendaItemForm = await superValidate(zod4(AddAgendaItemFormSchema));

	return {
		form,
		addAgendaItemForm,
		committeesData: committeesResult.data?.findManyCommittees ?? [],
		imageDataURL: conference.imageDataURL,
		emblemDataURL: conference.emblemDataURL,
		certificateContentSet: conference.certificateContentSet,
		termsAndConditionsContentSet: conference.termsAndConditionsContentSet,
		mediaConsentContentSet: conference.mediaConsentContentSet,
		guardianConsentContentSet: conference.guardianConsentContentSet,
		contractContentSet: conference.contractContentSet,
		technicalRegistrationDeadline: dayjs(conference.startAssignment)
			.add(conference.registrationDeadlineGracePeriodMinutes, 'minute')
			.toDate()
	};
};

export const actions = {
	updateSettings: async (event) => {
		const form = await superValidate(event.request, zod4(conferenceSettingsFormSchema));
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
	},
	addAgendaItem: async (event) => {
		const form = await superValidate(event.request, zod4(AddAgendaItemFormSchema));
		if (!form.valid) {
			return fail(400, { addAgendaItemForm: form });
		}
		await AddAgendaItemMutation.mutate(
			{
				...form.data,
				teaserText: form.data.teaserText || undefined
			},
			{ event }
		);

		cache.markStale();

		return message(form, m.saved());
	}
} satisfies Actions;
