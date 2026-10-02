import { client } from './rumbleClient/client';
import { ofAgeAtConference } from '$lib/helpers/ageChecker';
import {
	downloadCompletePostalRegistrationPDF,
	type ParticipantData,
	type RecipientData
} from '$lib/utils/pdfGenerator';

/**
 * Reads everything a postal registration PDF is built from: the person's address and birthday,
 * and the conference's postal address and consent texts.
 *
 * Meant to be called once, at the moment of download. The consent texts are long and nobody
 * looks at them on screen, so no component should keep them in a live query.
 */
export async function fetchPostalRegistrationSources(userId: string, conferenceId: string) {
	const [user, conference] = await Promise.all([
		client.query.user({
			__args: { id: userId },
			id: true,
			givenName: true,
			familyName: true,
			street: true,
			apartment: true,
			zip: true,
			city: true,
			country: true,
			birthday: true
		}),
		client.query.conference({
			__args: { id: conferenceId },
			startConference: true,
			postalName: true,
			postalStreet: true,
			postalApartment: true,
			postalZip: true,
			postalCity: true,
			postalCountry: true,
			contractContent: true,
			guardianConsentContent: true,
			mediaConsentContent: true,
			termsAndConditionsContent: true
		})
	]);
	return { user, conference };
}

export type PostalRegistrationSources = Awaited<ReturnType<typeof fetchPostalRegistrationSources>>;

export { formatPostalParticipantName } from './postalRegistrationData';

/**
 * Generates the postal registration documents from the conference's templates and downloads
 * them. Whether the guardian consent is included follows from the participant's age at the
 * start of the conference.
 */
export async function downloadPostalRegistrationDocuments({
	conference,
	birthday,
	participant,
	recipient,
	fileName
}: {
	conference: PostalRegistrationSources['conference'];
	birthday: Date;
	participant: ParticipantData;
	recipient: RecipientData;
	fileName: string;
}): Promise<void> {
	await downloadCompletePostalRegistrationPDF(
		ofAgeAtConference(conference.startConference, birthday),
		participant,
		recipient,
		conference.contractContent,
		conference.guardianConsentContent,
		conference.mediaConsentContent,
		conference.termsAndConditionsContent,
		fileName
	);
}
