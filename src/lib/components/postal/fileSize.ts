/** A file's size as people read it: `340 kB`, `1.2 MB`. */
export function formatFileSize({ bytes, locale }: { bytes: number; locale: string }) {
	const large = bytes >= 1_000_000;
	return new Intl.NumberFormat(locale, {
		style: 'unit',
		unit: large ? 'megabyte' : 'kilobyte',
		maximumFractionDigits: large ? 1 : 0
	}).format(large ? bytes / 1_000_000 : Math.max(1, bytes / 1000));
}
