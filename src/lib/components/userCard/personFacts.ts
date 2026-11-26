import { addressRules } from '#lib/helpers/addressRules';
import { getAgeAtConference } from '#lib/helpers/ageChecker';
import { hasAnyRole, type TeamAccess } from '#lib/helpers/teamAccess';
import { PARTICIPANT_CARE_ROLES, TEAM_ADMIN_ROLES } from '#lib/helpers/teamRoles';

/**
 * Whether the caller reads everything a person entered. Only then does an empty value mean that it
 * is missing: for everybody else the API masks columns, and those come back empty as well.
 * Mirrors the read rules of the user table (`userPermissions`).
 */
export function readsWholePerson({
	access,
	self,
	onTeam,
	inConference
}: {
	access: TeamAccess;
	/** The card is the caller's own */
	self: boolean;
	/** The person is on this conference's team */
	onTeam: boolean;
	/** The person takes part in this conference or waits for a seat */
	inConference: boolean;
}): boolean {
	if (access.isAdmin || self) return true;
	if (onTeam) return hasAnyRole({ access, roles: TEAM_ADMIN_ROLES });
	return inConference && hasAnyRole({ access, roles: PARTICIPANT_CARE_ROLES });
}

/** How old the person is when the conference starts, if both days are known. */
export function ageAtStart({
	birthday,
	startConference
}: {
	birthday: Date | null | undefined;
	startConference: Date | null | undefined;
}): { age: number; minor: boolean } | undefined {
	if (!birthday || !startConference) return undefined;
	const age = getAgeAtConference({ birthday, startConference });
	return age === undefined ? undefined : { age, minor: age < 18 };
}

interface StoredAddress {
	street?: string | null;
	apartment?: string | null;
	zip?: string | null;
	city?: string | null;
	region?: string | null;
	/** alpha-3, as the user table keeps it */
	country?: string | null;
}

export type AddressPart = 'street' | 'zip' | 'city' | 'region' | 'country';

/**
 * A stored address as the lines it is written in, and the parts a letter would need that are
 * missing: the street and the country everywhere, the rest where the country's addresses have it.
 */
export function addressFacts({
	address,
	countryName
}: {
	address: StoredAddress;
	countryName: (alpha3Code: string) => string;
}): { lines: string[]; missing: AddressPart[] } {
	const rules = addressRules(address.country);
	const region =
		rules.regions.find(({ value }) => value === address.region)?.label ?? address.region;
	const lines = [
		address.street,
		address.apartment,
		[address.zip, address.city].filter(Boolean).join(' '),
		region,
		address.country && countryName(address.country)
	].flatMap((line) => line?.trim() || []);
	const needed: [AddressPart, boolean][] = [
		['street', true],
		['zip', rules.zip === 'required'],
		['city', rules.city === 'required'],
		['region', rules.region === 'required'],
		['country', true]
	];
	return {
		lines,
		missing: needed.flatMap(([part, need]) => (need && !address[part]?.trim() ? [part] : []))
	};
}
