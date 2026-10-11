import type { ParticipantData, RecipientData } from '$lib/utils/pdfGenerator';
import formatNames from '$lib/helpers/formatNames';
import type { ConferenceSettings } from '../form-schema';

type PostalAddress = Pick<
	ConferenceSettings,
	'postalName' | 'postalStreet' | 'postalZip' | 'postalCity' | 'postalCountry'
>;

const notSet = (value: string | undefined) => value ?? 'Not set';

/** The conference's postal address as the recipient of a test print, as currently entered. */
export function testPrintRecipient(address: PostalAddress): RecipientData {
	return {
		name: notSet(address.postalName),
		address: notSet(address.postalStreet),
		zip: notSet(address.postalZip),
		city: notSet(address.postalCity),
		country: notSet(address.postalCountry)
	};
}

/** The made-up participant a test print is addressed from. */
export function testPrintParticipant(): ParticipantData {
	return {
		id: '123456781234567812345678',
		name: formatNames('Antonio', 'Guterres', {
			givenNameFirst: true,
			familyNameUppercase: true,
			givenNameUppercase: true
		}),
		address: '405 E 45th St, New York, NY 10017, USA',
		birthday: new Date('1949-04-30').toLocaleDateString()
	};
}

/** A template the API returns as null is passed on to the PDF generator as "use the default". */
export function templateOrDefault(template: string | null | undefined): string | undefined {
	return template ?? undefined;
}
