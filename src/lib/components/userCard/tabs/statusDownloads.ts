import { getLocale } from '#lib/paraglide/runtime';
import { formatPostalParticipantName } from '#lib/api/postalRegistrationSources';
import formatNames from '#lib/helpers/formatNames';
import type { ParticipantData } from '#lib/utils/pdfGenerator';

type Text = string | null | undefined;

/** Whether the conference has the full postal address the documents are sent to. */
export function hasPostalAddress(conference: {
	postalName: Text;
	postalStreet: Text;
	postalZip: Text;
	postalCity: Text;
	postalCountry: Text;
}) {
	return [
		conference.postalName,
		conference.postalStreet,
		conference.postalZip,
		conference.postalCity,
		conference.postalCountry
	].every(Boolean);
}

/**
 * What the postal documents print about a participant when the care team downloads them: the
 * address with whatever parts are known. Undefined without a birthday, which the documents need.
 */
export function careTeamPostalParticipant(user: {
	id: string;
	givenName: Text;
	familyName: Text;
	street: Text;
	apartment: Text;
	zip: Text;
	city: Text;
	country: Text;
	birthday: Date | null | undefined;
}): { participant: ParticipantData; birthday: Date } | undefined {
	const { birthday } = user;
	if (!birthday) return undefined;
	const address = [
		[user.street, user.apartment].filter(Boolean).join(' '),
		[user.zip, user.city].filter(Boolean).join(' '),
		user.country
	]
		.filter(Boolean)
		.join(', ');
	return {
		birthday,
		participant: {
			id: user.id,
			name: formatPostalParticipantName({ givenName: user.givenName, familyName: user.familyName }),
			address,
			birthday: birthday.toLocaleDateString(getLocale())
		}
	};
}

/** A downloaded document's file name: the family name, then the given name, then what it is. */
export function documentFileName({
	user,
	document
}: {
	user: { givenName: Text; familyName: Text };
	document: 'postal_registration' | 'certificate';
}) {
	const name = formatNames({
		givenName: user.givenName ?? undefined,
		familyName: user.familyName ?? undefined,
		options: {
			givenNameFirst: false,
			delimiter: '_'
		}
	});
	return `${name}_${document}.pdf`;
}

/** What a certificate prints, or undefined while the API cannot sign one for the person. */
export function certificateContentsOf(
	jwtData:
		| {
				jwt?: string | null;
				fullName?: string | null;
				sessions: readonly string[];
		  }
		| null
		| undefined
) {
	if (!jwtData?.fullName || !jwtData.jwt) return undefined;
	return {
		fullName: jwtData.fullName,
		jwt: jwtData.jwt,
		sessions: [...jwtData.sessions]
	};
}
