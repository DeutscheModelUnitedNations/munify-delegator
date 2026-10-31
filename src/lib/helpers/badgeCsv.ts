/**
 * The files the badge generator (https://badges.dmun.de, `PUBLIC_BADGE_GENERATOR_URL`) prints
 * nametags and table placards ("Länderschilder") from: one CSV, one row per sign. It reads the
 * columns by their header name, so their order does not matter, and decodes UTF-8 only. A row
 * needs `name` or `committee`, and a flag (`countryAlpha2Code`, `un` for the UN flag) or an image
 * of its library (`alternativeImage`) - never both.
 */
export interface Badge {
	name: string;
	committee?: string | null;
	countryName: string;
	countryAlpha2Code?: string | null;
	alternativeImage?: string | null;
	pronouns?: string | null;
	id?: string | null;
	mediaConsentStatus?: string;
}

/** The columns of the badge CSV. */
export const badgeHeader = [
	'name',
	'committee',
	'countryName',
	'countryAlpha2Code',
	'alternativeImage',
	'pronouns',
	'id',
	'mediaConsentStatus'
];

/** One badge as a CSV row matching `badgeHeader`; missing values become empty cells. */
export function badgeRow(badge: Badge): string[] {
	return [
		badge.name,
		badge.committee ?? '',
		badge.countryName,
		badge.countryAlpha2Code ?? '',
		badge.alternativeImage ?? '',
		badge.pronouns ?? '',
		badge.id ?? '',
		badge.mediaConsentStatus ?? 'NOT_SET'
	];
}

/** The role a person's badge shows; what the generator needs to draw its flag or image. */
export type BadgeSeat =
	| { kind: 'nation'; alpha2Code: string; countryName: string; committee?: string | null }
	| { kind: 'label'; label: string; committee?: string | null }
	| { kind: 'image'; label: string; image: string };

/** One person's nametag. */
export function personBadge({
	person,
	seat
}: {
	person: { name: string; pronouns?: string | null; id: string; mediaConsentStatus?: string };
	seat: BadgeSeat;
}): Badge {
	const shared = {
		name: person.name,
		pronouns: person.pronouns,
		id: person.id,
		mediaConsentStatus: person.mediaConsentStatus
	};
	switch (seat.kind) {
		case 'nation':
			return {
				...shared,
				committee: seat.committee,
				countryName: seat.countryName,
				countryAlpha2Code: seat.alpha2Code
			};
		case 'label':
			return {
				...shared,
				committee: seat.committee,
				countryName: seat.label,
				countryAlpha2Code: 'un'
			};
		case 'image':
			return { ...shared, countryName: seat.label, alternativeImage: seat.image };
	}
}

export interface PlacardCommittee {
	abbreviation: string;
	/** The nations the committee seats. */
	nations: { alpha2Code: string; alpha3Code: string }[];
	/** Names of the non-state actors with someone in the committee. */
	nonStateActors: string[];
}

/**
 * The table placards of a conference: one per seat at a committee's table - each nation the
 * committee seats and each non-state actor with somebody in it - under the UN flag for the
 * latter. No person names: a placard marks a seat. Non-state actors nobody in a committee
 * represents get one placard each, named by `unseatedNonStateActors`. Sorted by committee, then
 * by name.
 */
export function placardBadges({
	committees,
	unseatedNonStateActors,
	countryName
}: {
	committees: readonly PlacardCommittee[];
	unseatedNonStateActors: readonly string[];
	countryName: (alpha3Code: string) => string;
}): Badge[] {
	const byName = (a: Badge, b: Badge) => a.countryName.localeCompare(b.countryName);
	const seated = committees
		.toSorted((a, b) => a.abbreviation.localeCompare(b.abbreviation))
		.flatMap((committee) =>
			[
				...committee.nations.map((nation) => ({
					name: '',
					committee: committee.abbreviation,
					countryName: countryName(nation.alpha3Code),
					countryAlpha2Code: nation.alpha2Code,
					mediaConsentStatus: 'ALLOWED_ALL'
				})),
				...[...new Set(committee.nonStateActors)].map((label) => ({
					name: '',
					committee: committee.abbreviation,
					countryName: label,
					countryAlpha2Code: 'un',
					mediaConsentStatus: 'ALLOWED_ALL'
				}))
			].sort(byName)
		);
	const unseated = [...new Set(unseatedNonStateActors)]
		.map((label) => ({
			name: label,
			countryName: label,
			countryAlpha2Code: 'un',
			mediaConsentStatus: 'ALLOWED_ALL'
		}))
		.sort(byName);
	return [...seated, ...unseated];
}
