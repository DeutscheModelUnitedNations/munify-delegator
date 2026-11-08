import { getLocale } from '#lib/paraglide/runtime';
import type {
	ParticipantCertificateData,
	ParticipantData,
	RecipientData
} from '#lib/utils/pdfGenerator';
import formatNames from '#lib/helpers/formatNames';
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
		name: formatNames({
			givenName: 'Antonio',
			familyName: 'Guterres',
			options: {
				givenNameFirst: true,
				familyNameUppercase: true,
				givenNameUppercase: true
			}
		}),
		address: '405 E 45th St, New York, NY 10017, USA',
		birthday: new Date('1949-04-30').toLocaleDateString(getLocale())
	};
}

/** A template the API returns as null is passed on to the PDF generator as "use the default". */
export function templateOrDefault(template: string | null | undefined): string | undefined {
	return template ?? undefined;
}

/**
 * A code as long as a real one, in the alphabet signed codes are written in, so a test print's QR
 * code is as dense as a real one. It is signed by nobody: scanned, it is refused.
 */
const testPrintCode = (length: number) => {
	const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWX';
	return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join(
		''
	);
};

/** What a test print's documents carry instead of a signed code, as long as a real one. */
export const testPrintDocumentCode = () => testPrintCode(205);

/** The made-up holder of a test certificate, with a code as long as a real one and a few sessions. */
export function testPrintCertificate(sessions: string[]): ParticipantCertificateData {
	return {
		fullName: 'Antonio Guterres',
		code: testPrintCode(350),
		sessions
	};
}
