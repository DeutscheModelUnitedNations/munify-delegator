import worldCountries from 'world-countries';

/**
 * Retrieves the UN regional group for a nation based on its ISO alpha-3 code.
 *
 * @param alpha3Code - The ISO alpha-3 code identifying the nation.
 * @returns The UN regional group associated with the specified nation, if found;
 * otherwise, returns undefined.
 */
export default function getNationRegionalGroup(alpha3Code: string) {
	let regionalGroup: string | undefined;
	worldCountries.forEach((country) => {
		if (country.cca3.toUpperCase() === alpha3Code.toUpperCase()) {
			regionalGroup = country.unRegionalGroup;
		}
	});

	return regionalGroup;
}
