import { client } from './rumbleClient/client';
import { ofAgeAtConference } from '#lib/helpers/ageChecker';
import {
	downloadCompletePostalRegistrationPDF,
	type ParticipantData,
	type RecipientData
} from '#lib/utils/pdfGenerator';

/**
 * Reads everything a postal registration PDF is built from: the person's address and birthday,
 * the conference's postal address and consent texts, and the signed code the documents carry.
 *
 * Meant to be called once, at the moment of download. The templates are PDFs, so only their
 * URLs are selected; the PDF generator fetches the files.
 */
export async function fetchPostalRegistrationSources({
	userId,
	conferenceId
}: {
	userId: string;
	conferenceId: string;
}) {
	const [user, conference, { code: documentCode }] = await Promise.all([
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
			contractFile: { url: true },
			guardianConsentFile: { url: true },
			mediaConsentFile: { url: true },
			termsAndConditionsFile: { url: true },
			documentLayouts: true
		}),
		client.mutate.issueDocumentCode({ __args: { conferenceId, userId }, code: true })
	]);
	return { user, conference, documentCode };
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
	documentCode,
	recipient,
	fileName
}: {
	conference: PostalRegistrationSources['conference'];
	birthday: Date;
	participant: ParticipantData;
	documentCode: string;
	recipient: RecipientData;
	fileName: string;
}): Promise<void> {
	await downloadCompletePostalRegistrationPDF({
		isOfAge: ofAgeAtConference({
			startConference: conference.startConference,
			dateOfBirth: birthday
		}),
		participant,
		documentCode,
		recipient,
		templates: conference,
		fileName
	});
}
