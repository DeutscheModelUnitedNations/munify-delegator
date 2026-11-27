import { m } from '#lib/paraglide/messages';
import { COUNTRY_INDICATORS, type CountryIndicatorCode } from './indicators';
import { formatIndicator } from './formatIndicator';

const labels: Record<CountryIndicatorCode, { title: () => string; desc: () => string }> = {
	'SP.POP.TOTL': { title: m.countryIndicatorPopulation, desc: m.countryIndicatorPopulationDesc },
	'NY.GDP.MKTP.CD': { title: m.countryIndicatorGdp, desc: m.countryIndicatorGdpDesc },
	'NY.GDP.PCAP.CD': {
		title: m.countryIndicatorGdpPerCapita,
		desc: m.countryIndicatorGdpPerCapitaDesc
	},
	'SP.DYN.LE00.IN': {
		title: m.countryIndicatorLifeExpectancy,
		desc: m.countryIndicatorLifeExpectancyDesc
	},
	'SE.ADT.LITR.ZS': { title: m.countryIndicatorLiteracy, desc: m.countryIndicatorLiteracyDesc },
	'SL.UEM.TOTL.ZS': {
		title: m.countryIndicatorUnemployment,
		desc: m.countryIndicatorUnemploymentDesc
	}
};

export type IndicatorFigure = { indicator: string; value: number | null; year: number | null };

/** What a card says when there is a value: its unit, and the year when known. */
function describe({ code, year }: { code: CountryIndicatorCode; year: number | null }) {
	const desc = labels[code].desc();
	return year ? `${desc} · ${m.countryIndicatorAsOf({ year: String(year) })}` : desc;
}

/**
 * One card per indicator of the country information, in display order, from what the API
 * answered; an indicator it has no value for reads "–" and says so.
 */
export function indicatorCards({
	figures,
	locale
}: {
	figures: IndicatorFigure[];
	locale: string;
}) {
	return COUNTRY_INDICATORS.map(({ code, icon, format }) => {
		const figure = figures.find(({ indicator }) => indicator === code);
		const title = labels[code].title();
		if (figure?.value == null)
			return { code, icon, title, value: '–', desc: m.countryIndicatorNoData() };
		return {
			code,
			icon,
			title,
			value: formatIndicator({ value: figure.value, format, locale }),
			desc: describe({ code, year: figure.year })
		};
	});
}
