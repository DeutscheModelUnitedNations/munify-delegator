type Text = string | null | undefined;

/** What the postal documents print about a person. */
export interface PostalDetails {
	givenName: Text;
	familyName: Text;
	street: Text;
	apartment: Text;
	zip: Text;
	city: Text;
	country: Text;
	birthday: Date | null | undefined;
}

/**
 * Tells whether the details changed (32-bit FNV-1a, as hex); undefined while some are missing. It is
 * kept on the server, so it is short on purpose: far too many details share one to name any.
 */
export function detailsFingerprint(details: PostalDetails): string | undefined {
	const { givenName, familyName, street, apartment, zip, city, country, birthday } = details;
	if (!street || !zip || !city || !country || !birthday) return undefined;
	const text = JSON.stringify([
		givenName,
		familyName,
		street,
		apartment,
		zip,
		city,
		country,
		birthday.toISOString().slice(0, 10)
	]);
	let hash = 0x811c9dc5;
	for (const byte of new TextEncoder().encode(text)) hash = Math.imul(hash ^ byte, 0x01000193);
	return (hash >>> 0).toString(16).padStart(8, '0');
}

/** The details in short, for a step that is done. */
export function detailsSummary({ givenName, familyName, street, zip, city }: PostalDetails) {
	return `${[givenName, familyName].filter(Boolean).join(' ')}, ${street}, ${zip} ${city}`;
}
