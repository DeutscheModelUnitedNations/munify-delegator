import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
	contentHash,
	latestTerms,
	parseTermsDocument,
	termsInLocale
} from './messagingTermsDocument';

/**
 * The message service's terms as the app reads them (`terms.ts`), from the files themselves: the
 * seeds run under Bun, which has no `import.meta.glob`.
 */
function currentTermsOnDisk() {
	const directory = fileURLToPath(new URL('./terms/', import.meta.url));
	return latestTerms(
		readdirSync(directory)
			.filter((name) => name.endsWith('.yaml'))
			.map((name) => parseTermsDocument({ source: readFileSync(directory + name, 'utf8'), name }))
	);
}

/** The acceptance rows of `userIds` agreeing to the terms as they stand, in German. */
export function seedAcceptancesOf(userIds: readonly string[]) {
	const shown = termsInLocale({ document: currentTermsOnDisk(), locale: 'de' });
	return userIds.map((userId) => ({
		userId,
		version: shown.version,
		revision: shown.revision,
		locale: shown.locale,
		contentHash: contentHash(shown),
		confirmationIds: shown.confirmations.map((confirmation) => confirmation.id)
	}));
}
