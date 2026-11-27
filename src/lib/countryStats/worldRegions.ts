import { m } from '#lib/paraglide/messages';

/**
 * world-countries' regions and subregions (English, as the package names them) in the reader's
 * locale. A name the package adds later shows as it comes.
 */
const regionLabels: Record<string, () => string> = {
	Africa: m.worldRegionAfrica,
	Americas: m.worldRegionAmericas,
	Antarctic: m.worldRegionAntarctic,
	Asia: m.worldRegionAsia,
	Europe: m.worldRegionEurope,
	Oceania: m.worldRegionOceania
};

const subregionLabels: Record<string, () => string> = {
	'Australia and New Zealand': m.worldSubregionAustraliaAndNewZealand,
	Caribbean: m.worldSubregionCaribbean,
	'Central America': m.worldSubregionCentralAmerica,
	'Central Asia': m.worldSubregionCentralAsia,
	'Central Europe': m.worldSubregionCentralEurope,
	'Eastern Africa': m.worldSubregionEasternAfrica,
	'Eastern Asia': m.worldSubregionEasternAsia,
	'Eastern Europe': m.worldSubregionEasternEurope,
	Melanesia: m.worldSubregionMelanesia,
	Micronesia: m.worldSubregionMicronesia,
	'Middle Africa': m.worldSubregionMiddleAfrica,
	'North America': m.worldSubregionNorthAmerica,
	'Northern Africa': m.worldSubregionNorthernAfrica,
	'Northern Europe': m.worldSubregionNorthernEurope,
	Polynesia: m.worldSubregionPolynesia,
	'South America': m.worldSubregionSouthAmerica,
	'South-Eastern Asia': m.worldSubregionSouthEasternAsia,
	'Southeast Europe': m.worldSubregionSoutheastEurope,
	'Southern Africa': m.worldSubregionSouthernAfrica,
	'Southern Asia': m.worldSubregionSouthernAsia,
	'Southern Europe': m.worldSubregionSouthernEurope,
	'Western Africa': m.worldSubregionWesternAfrica,
	'Western Asia': m.worldSubregionWesternAsia,
	'Western Europe': m.worldSubregionWesternEurope
};

/** "Ostafrika (Afrika)", or the region alone for a country without subregion. */
export function translateWorldRegion({ region, subregion }: { region: string; subregion: string }) {
	const regionLabel = regionLabels[region]?.() ?? region;
	if (!subregion) return regionLabel;
	return `${subregionLabels[subregion]?.() ?? subregion} (${regionLabel})`;
}
