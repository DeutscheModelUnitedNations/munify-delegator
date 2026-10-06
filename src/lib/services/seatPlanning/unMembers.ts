import worldCountries from 'world-countries';

/** The five UN regional groups, in the order the seat planning matrix lists them */
export const regionalGroups = [
	'African Group',
	'Asia and the Pacific Group',
	'Eastern European Group',
	'Latin American and Caribbean Group',
	'Western European and Others Group'
] as const;

export type RegionalGroup = (typeof regionalGroups)[number];

const isRegionalGroup = (value: string): value is RegionalGroup =>
	regionalGroups.some((group) => group === value);

export interface UnMember {
	/** lowercase, as stored in the `Nation` table */
	alpha3Code: string;
	alpha2Code: string;
	regionalGroup: RegionalGroup;
	region: string;
	subregion: string;
	capital: string[];
	/** ISO 639-3 code and English name */
	languages: { code: string; name: string }[];
	/** uppercase alpha-3 codes of the neighbouring countries */
	borders: string[];
	landlocked: boolean;
}

/**
 * The 193 UN member states. world-countries also flags the Holy See as `unMember`, but it has no
 * regional group and is modelled as a non-state actor in the seat planning.
 */
export const unMembers: UnMember[] = worldCountries.flatMap((country) => {
	if (!country.unMember || !isRegionalGroup(country.unRegionalGroup)) return [];
	return [
		{
			alpha3Code: country.cca3.toLowerCase(),
			alpha2Code: country.cca2.toLowerCase(),
			regionalGroup: country.unRegionalGroup,
			region: country.region,
			subregion: country.subregion,
			capital: country.capital,
			languages: Object.entries(country.languages).map(([code, name]) => ({ code, name })),
			borders: country.borders,
			landlocked: country.landlocked
		}
	];
});
