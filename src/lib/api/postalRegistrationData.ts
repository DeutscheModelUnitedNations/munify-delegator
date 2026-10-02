import formatNames, { formatInitials } from '$lib/helpers/formatNames';
import type { ParticipantData, RecipientData } from '$lib/utils/pdfGenerator';

type Text = string | null | undefined;

/** The participant's name as the postal documents print it: given name first, all uppercase. */
export function formatPostalParticipantName(givenName: Text, familyName: Text): string {
	return formatNames(givenName ?? undefined, familyName ?? undefined, {
		givenNameFirst: true,
		familyNameUppercase: true,
		givenNameUppercase: true
	});
}

/** The conference's postal address, with missing parts left blank. */
export function postalRecipient(conference: {
	postalName: Text;
	postalStreet: Text;
	postalApartment: Text;
	postalZip: Text;
	postalCity: Text;
	postalCountry: Text;
}): RecipientData {
	return {
		name: `${conference.postalName}`,
		address: `${conference.postalStreet} ${conference.postalApartment ? conference.postalApartment : ''}`,
		zip: conference.postalZip?.toString() ?? '',
		city: conference.postalCity ?? '',
		country: conference.postalCountry ?? ''
	};
}

/**
 * What the postal documents print about the participant, and the file they are saved as. Undefined
 * while the address or the birthday is incomplete, since the documents cannot be filled in then.
 */
export function postalParticipant(user: {
	id: string;
	givenName: Text;
	familyName: Text;
	street: Text;
	apartment: Text;
	zip: Text;
	city: Text;
	country: Text;
	birthday: Date | null | undefined;
}): { participant: ParticipantData; birthday: Date; fileName: string } | undefined {
	const { street, zip, city, country, birthday } = user;
	if (!street || !zip || !city || !country || !birthday) return undefined;

	return {
		birthday,
		participant: {
			id: user.id,
			name: formatPostalParticipantName(user.givenName, user.familyName),
			address: `${street} ${user.apartment ? user.apartment : ''}, ${zip} ${city}, ${country}`,
			birthday: birthday.toLocaleDateString()
		},
		fileName: `${formatInitials(user.givenName ?? undefined, user.familyName ?? undefined)}_postal_registration.pdf`
	};
}
