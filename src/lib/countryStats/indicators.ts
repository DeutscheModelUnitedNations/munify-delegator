/**
 * The World Bank indicators the country information shows, in display order. The API serves only
 * these (`countryIndicators`), so it is no open proxy to the World Bank; the client formats and
 * labels them by `code`.
 */
export const COUNTRY_INDICATORS = [
	{ code: 'SP.POP.TOTL', icon: 'users', format: 'compact' },
	{ code: 'NY.GDP.MKTP.CD', icon: 'chart-line-up', format: 'usdCompact' },
	{ code: 'NY.GDP.PCAP.CD', icon: 'coins', format: 'usd' },
	{ code: 'SP.DYN.LE00.IN', icon: 'heartbeat', format: 'decimal' },
	{ code: 'SE.ADT.LITR.ZS', icon: 'graduation-cap', format: 'percent' },
	{ code: 'SL.UEM.TOTL.ZS', icon: 'briefcase', format: 'percent' }
] as const;

export type CountryIndicatorCode = (typeof COUNTRY_INDICATORS)[number]['code'];
export type CountryIndicatorFormat = (typeof COUNTRY_INDICATORS)[number]['format'];

export const COUNTRY_INDICATOR_CODES: readonly CountryIndicatorCode[] = COUNTRY_INDICATORS.map(
	({ code }) => code
);
