import type { BadgeSeat } from '#lib/helpers/badgeCsv.js';

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
				delegation: {
					assignedRole?: { nation: { alpha3Code: string; alpha2Code: string } | null } | null;
				};
				assignedCommittee?: { abbreviation: string } | null;
		  }
		| undefined,
	countryName: (alpha3Code: string) => string
) {
	// Only a nation role has a nation; a non-state actor shows no country on the badge.
	const nation = member?.delegation.assignedRole?.nation;
	return {
		countryName: nation && countryName(nation.alpha3Code),
		countryAlpha2Code: nation?.alpha2Code,
		committee: member?.assignedCommittee?.abbreviation
	};
}

/**
 * What a person's badge shows, from the registration they hold: a delegate's nation and committee
 * (or their non-state actor), a single participant's role, a supervisor's image, the team label.
 * Undefined while they hold nothing a badge could show.
 */
export function badgeSeatOf(
	roles: {
		delegationMember?:
			| {
					assignedCommittee?: { abbreviation: string } | null;
					delegation: {
						assignedRole?: {
							name?: string | null;
							nation?: { alpha2Code: string; alpha3Code: string } | null;
						} | null;
					};
			  }
			| undefined;
		singleParticipant?: { assignedRole?: { name?: string | null } | null } | undefined;
		conferenceSupervisor?: object | undefined;
		teamMember?: object | undefined;
	},
	labels: { countryName: (alpha3Code: string) => string; supervisor: string; team: string }
): BadgeSeat | undefined {
	const role = roles.delegationMember?.delegation.assignedRole;
	const committee = roles.delegationMember?.assignedCommittee?.abbreviation;
	if (role?.nation) {
		return {
			kind: 'nation',
			alpha2Code: role.nation.alpha2Code,
			countryName: labels.countryName(role.nation.alpha3Code),
			committee
		};
	}
	if (role?.name) return { kind: 'label', label: role.name, committee };
	const single = roles.singleParticipant?.assignedRole?.name;
	if (single) return { kind: 'label', label: single };
	if (roles.conferenceSupervisor) {
		return { kind: 'image', label: labels.supervisor, image: 'supervisor' };
	}
	if (roles.teamMember) return { kind: 'label', label: labels.team };
	return undefined;
}
