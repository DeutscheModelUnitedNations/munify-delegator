import type { CountryIndicatorFormat } from './indicators';

/**
 * A World Bank figure as the country information shows it, in `locale`: large numbers in the
 * locale's short scale ("83,3 Mio.", "83.3M"), money in US dollars as the World Bank reports it,
 * percentages from the World Bank's 0–100 values.
 */
export function formatIndicator({
	value,
	format,
	locale
}: {
	value: number;
	format: CountryIndicatorFormat;
	locale: string;
}): string {
	switch (format) {
		case 'compact':
			return new Intl.NumberFormat(locale, {
				notation: 'compact',
				maximumFractionDigits: 1
			}).format(value);
		case 'usdCompact':
			return new Intl.NumberFormat(locale, {
				style: 'currency',
				currency: 'USD',
				notation: 'compact',
				maximumFractionDigits: 1
			}).format(value);
		case 'usd':
			return new Intl.NumberFormat(locale, {
				style: 'currency',
				currency: 'USD',
				maximumFractionDigits: 0
			}).format(value);
		case 'decimal':
			return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
		case 'percent':
			return new Intl.NumberFormat(locale, {
				style: 'percent',
				maximumFractionDigits: 1
			}).format(value / 100);
	}
}
