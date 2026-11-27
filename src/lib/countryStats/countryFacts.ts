import worldCountries from 'world-countries';

/**
 * What the country information shows about a country from world-countries (mledoze/countries),
 * which ships with the app: no request, no cache. Names stay codes where Intl or the messages
 * translate them in the component (`worldRegions.ts`, `Intl.DisplayNames`).
 */
export type CountryFacts = {
	alpha2Code: string;
	alpha3Code: string;
	numericCode: string;
	/** Some countries have several (South Africa); none for a few territories */
	capitals: string[];
	/** in km² */
	area: number;
	region: string;
	subregion: string;
	landlocked: boolean;
	/** uppercase alpha-3 codes */
	borders: string[];
	/** ISO 639-3 code and English name, for when Intl has none */
	languages: { code: string; name: string }[];
	/** ISO 4217 code, English name and symbol */
	currencies: { code: string; name: string; symbol: string }[];
	callingCode: string | undefined;
	topLevelDomains: string[];
	/** English only: world-countries has no German demonyms */
	demonym: string | undefined;
	/** latitude and longitude of the country's centre */
	center: { lat: number; lng: number };
};

const byAlpha3 = new Map(worldCountries.map((country) => [country.cca3, country]));

/**
 * The international calling code: root and suffix together where there is one suffix ("+254"),
 * the root alone where the suffixes are area codes within a shared plan ("+1" for the USA or the
 * Dominican Republic, "+7" for Kazakhstan).
 */
export function callingCodeOf({ root, suffixes }: { root: string; suffixes: string[] }) {
	if (!root) return undefined;
	const [suffix] = suffixes;
	return suffixes.length === 1 && suffix ? root + suffix : root;
}

export function countryFactsOf(alpha3Code: string): CountryFacts | undefined {
	const country = byAlpha3.get(alpha3Code.toUpperCase());
	if (!country) return undefined;
	const [lat = 0, lng = 0] = country.latlng;
	return {
		alpha2Code: country.cca2,
		alpha3Code: country.cca3,
		numericCode: country.ccn3,
		capitals: country.capital,
		area: country.area,
		region: country.region,
		subregion: country.subregion,
		landlocked: country.landlocked,
		borders: country.borders,
		languages: Object.entries(country.languages).map(([code, name]) => ({ code, name })),
		currencies: Object.entries(country.currencies).map(([code, { name, symbol }]) => ({
			code,
			name,
			symbol
		})),
		callingCode: callingCodeOf(country.idd),
		topLevelDomains: country.tld,
		demonym: country.demonyms.eng?.m || undefined,
		center: { lat, lng }
	};
}
