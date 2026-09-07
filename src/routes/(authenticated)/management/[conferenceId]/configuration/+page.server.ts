import type { PageServerLoad } from './$types';
import { fail, message, superValidate, withFiles } from 'sveltekit-superforms';
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
			logoDataURL
			language
			linkToPreparationGuide
			linkToTeamWiki
			linkToServicesPage
			isOpenPaperSubmission
			showCalendar
			timezone
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

const ConfigurationResolutionsQuery = graphql(`
	query ConfigurationResolutionsQuery($conferenceId: String!) {
		findManyResolutions(
			where: { conferenceId: { equals: $conferenceId } }
			orderBy: [{ createdAt: asc }]
		) {
			id
			title
			fileName
			createdAt
			committee {
				id
				name
				abbreviation
			}
		}
	}
`);

const CreateResolutionMutation = graphql(`
	mutation CreateResolutionFromFormMutation(
		$conferenceId: String!
		$title: String
		$committeeId: String
		$file: File!
	) {
		createResolution(
			conferenceId: $conferenceId
			title: $title
			committeeId: $committeeId
			file: $file
		) {
			id
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
	const [conferenceResult, committeesResult, resolutionsResult] = await Promise.all([
		conferenceQuery.fetch({
			event,
			variables: { id: event.params.conferenceId },
			blocking: true
		}),
		ConfigurationCommitteesQuery.fetch({
			event,
			variables: { conferenceId: event.params.conferenceId },
			blocking: true
		}),
		ConfigurationResolutionsQuery.fetch({
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
		resolutionsData: resolutionsResult.data?.findManyResolutions ?? [],
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
		await conferenceUpdate.mutate(
			{
				data: form.data,
				where: {
					id: event.params.conferenceId
				}
			},
			{ event }
		);

		return message(withFiles(form), m.saved());
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
	},
	uploadResolutions: async (event) => {
		const conferenceId = event.params.conferenceId;
		if (!conferenceId) {
			throw error(404, m.notFound());
		}

		const formData = await event.request.formData();
		const files = formData
			.getAll('files')
			.filter((f): f is File => f instanceof File && f.size > 0);
		const committeeId = formData.get('committeeId');

		if (files.length === 0) {
			return fail(400, { uploadError: m.resolutionUploadNoFiles() });
		}

		// PDF-only, max 10 MB each - mirrors the base document upload limits.
		for (const file of files) {
			const isPdf = file.type === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf');
			if (!isPdf) {
				return fail(400, { uploadError: m.resolutionUploadOnlyPdf() });
			}
			if (file.size > 10_000_000) {
				return fail(400, { uploadError: m.resolutionUploadTooLarge() });
			}
		}

		for (const file of files) {
			await CreateResolutionMutation.mutate(
				{
					conferenceId,
					committeeId: typeof committeeId === 'string' && committeeId ? committeeId : undefined,
					title: undefined,
					file
				},
				{ event }
			);
		}

		cache.markStale();

		return { uploaded: files.length };
	}
} satisfies Actions;
