import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { latestTerms, parseTermsDocument } from './messagingTermsDocument';

/**
 * The message service's terms as the app reads them (`terms.ts`), from the files themselves: the
 * seeds run under Bun, which has no `import.meta.glob`. Not for the app, which bundles the files.
 */
export function currentTermsFromFiles() {
	const directory = fileURLToPath(new URL('./terms/', import.meta.url));
	return latestTerms(
		readdirSync(directory)
			.filter((name) => name.endsWith('.yaml'))
			.map((name) => parseTermsDocument({ source: readFileSync(directory + name, 'utf8'), name }))
	);
}
