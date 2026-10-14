/** What the badge generator is told about a person; every field is left out when unknown. */
export interface BadgeSessionBody {
	name?: string;
	countryName?: string;
	countryAlpha2Code?: string;
	committee?: string;
	pronouns?: string;
	id?: string;
	mediaConsentStatus?: string;
}

/** The known values only: empty strings and nullish values are dropped. */
export function badgeSessionBody(values: {
	givenName?: string | null;
	familyName?: string | null;
	countryName?: string | null;
	countryAlpha2Code?: string | null;
	committee?: string | null;
	pronouns?: string | null;
	id?: string | null;
	mediaConsentStatus?: string | null;
}): BadgeSessionBody {
	const { givenName, familyName, ...rest } = values;
	const entries = Object.entries({
		...rest,
		name: givenName && familyName ? `${givenName} ${familyName}` : undefined
	}).filter(([, value]) => !!value);
	return Object.fromEntries(entries);
}

/** The session url out of the generator's response, upgraded to https; undefined if malformed. */
export function badgeSessionUrl(data: unknown): string | undefined {
	if (typeof data !== 'object' || data === null || !('url' in data)) return undefined;
	const { url } = data;
	if (typeof url !== 'string' || url.trim() === '') return undefined;
	return url.replace('http://', 'https://');
}

/** Asks the badge generator for a session and returns its url; throws when it cannot be had. */
export async function requestBadgeSession(baseUrl: string | undefined, body: BadgeSessionBody) {
	const res = await fetch(`${baseUrl}/api/session/create`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(`Badge generator API error (${res.status}): ${await res.text()}`);
	const data: unknown = await res.json();
	const url = badgeSessionUrl(data);
	if (!url) throw new Error(`Badge generator returned invalid response: ${JSON.stringify(data)}`);
	return url;
}

/** The nation and committee a delegation member sits in, as the badge shows them. */
export function seatBadgeValues(
	member:
		| {
				delegation: { assignedNation?: { alpha3Code: string; alpha2Code: string } | null };
				assignedCommittee?: { abbreviation: string } | null;
		  }
		| undefined,
	countryName: (alpha3Code: string) => string
) {
	const nation = member?.delegation.assignedNation;
	return {
		countryName: nation && countryName(nation.alpha3Code),
		countryAlpha2Code: nation?.alpha2Code,
		committee: member?.assignedCommittee?.abbreviation
	};
}
