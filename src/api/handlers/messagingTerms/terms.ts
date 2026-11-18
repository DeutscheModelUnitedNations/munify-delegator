import { latestTerms, parseTermsDocument } from './messagingTermsDocument';

/**
 * Every version of the message service's terms (`terms/v<version>.yaml`), read once when the
 * module loads, and the version that stands. Older versions stay as the record of what people
 * agreed to.
 */

const files = import.meta.glob<string>('./terms/*.yaml', {
	query: '?raw',
	import: 'default',
	eager: true
});

export const allTerms = Object.entries(files).map(([name, source]) =>
	parseTermsDocument({ source, name })
);

/** The terms as they stand: what a participant has to have accepted before they write. */
export const currentTerms = latestTerms(allTerms);
