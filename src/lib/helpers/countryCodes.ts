import worldCountries from 'world-countries';

const alpha2ByAlpha3 = new Map(worldCountries.map((c) => [c.cca3, c.cca2]));
const alpha3ByAlpha2 = new Map(worldCountries.map((c) => [c.cca2, c.cca3]));

/**
 * The ISO 3166-1 alpha-2 code of an alpha-3 one. The user table stores alpha-3; rumble's
 * `AddressInput` (and the address metadata behind it) speaks alpha-2.
 */
export function alpha3ToAlpha2(alpha3: string): string | undefined {
	return alpha2ByAlpha3.get(alpha3.toUpperCase());
}

/** The ISO 3166-1 alpha-3 code of an alpha-2 one; see `alpha3ToAlpha2`. */
export function alpha2ToAlpha3(alpha2: string): string | undefined {
	return alpha3ByAlpha2.get(alpha2.toUpperCase());
}
