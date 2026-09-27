import type { Actions, PageServerLoad } from './$types';
import { fail, message, superValidate, withFiles } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { client } from '$lib/api/rumbleClient/client';
import { error } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import { nullFieldsToUndefined } from '$lib/helpers/nullFieldsToUndefined';
import { conferenceSettingsFormSchema } from './form-schema';
import { AddAgendaItemFormSchema } from './committees/form-schema';
import dayjs from 'dayjs';

function fetchConference(id: string) {
	return client.query.conference({
		__args: { id },
		title: true,
		location: true,
		longTitle: true,
		startAssignment: true,
		registrationDeadlineGracePeriodMinutes: true,
		startConference: true,
		state: true,
		website: true,
		endConference: true,
		imageDataURL: true,
		emblemDataURL: true,
		logoDataURL: true,
		language: true,
		linkToPreparationGuide: true,
		linkToTeamWiki: true,
		linkToServicesPage: true,
		isOpenPaperSubmission: true,
		showCalendar: true,
		timezone: true,
		unlockPayments: true,
		unlockPostals: true,
		feeAmount: true,
		bic: true,
		currency: true,
		bankName: true,
		iban: true,
		accountHolder: true,
		postalName: true,
		postalStreet: true,
		postalApartment: true,
		postalZip: true,
		postalCity: true,
		postalCountry: true,
		contractContentSet: true,
		guardianConsentContentSet: true,
		mediaConsentContentSet: true,
		termsAndConditionsContentSet: true,
		certificateContentSet: true
	});
}

function fetchCommittees(conferenceId: string) {
	return client.query.committees({
		__args: { where: { conferenceId: { eq: conferenceId } } },
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
}

export const load: PageServerLoad = async (event) => {
	const [conference, committeesData] = await Promise.all([
		fetchConference(event.params.conferenceId),
		fetchCommittees(event.params.conferenceId)
	]);

	if (!conference) {
		throw error(404, m.notFound());
	}

	const form = await superValidate(
		nullFieldsToUndefined(conference),
		zod4(conferenceSettingsFormSchema)
	);

	const addAgendaItemForm = await superValidate(zod4(AddAgendaItemFormSchema));

	return {
		form,
		addAgendaItemForm,
		committeesData,
		imageDataURL: conference.imageDataURL,
		emblemDataURL: conference.emblemDataURL,
		logoDataURL: conference.logoDataURL,
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
			// The schema contains File fields (base PDFs, images). File objects cannot be
			// serialized by SvelteKit/devalue, so the form must be wrapped with `withFiles`
			// when returned - otherwise a failed validation crashes with
			// "Cannot stringify arbitrary non-POJOs".
			return fail(400, withFiles({ form }));
		}
		await client.mutate.updateConference({
			__args: { ...form.data, id: event.params.conferenceId },
			id: true,
			certificateContentSet: true,
			termsAndConditionsContentSet: true,
			mediaConsentContentSet: true,
			guardianConsentContentSet: true,
			contractContentSet: true
		});

		return message(withFiles(form), m.saved());
	},
	addAgendaItem: async (event) => {
		const form = await superValidate(event.request, zod4(AddAgendaItemFormSchema));
		if (!form.valid) {
			return fail(400, { addAgendaItemForm: form });
		}
		await client.mutate.createAgendaItem({
			__args: { ...form.data, teaserText: form.data.teaserText || undefined },
			id: true
		});

		return message(form, m.saved());
	}
} satisfies Actions;
