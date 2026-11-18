import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import {
	contentHash,
	latestTerms,
	parseTermsDocument,
	termsInLocale
} from '../../src/api/handlers/messagingTerms/messagingTermsDocument';

/**
 * The message service's terms as the app reads them (`terms.ts`), from the files themselves: the
 * seed runs under Bun, which has no `import.meta.glob`.
 */
function currentTerms() {
	const directory = fileURLToPath(
		new URL('../../src/api/handlers/messagingTerms/terms/', import.meta.url)
	);
	return latestTerms(
		readdirSync(directory)
			.filter((name) => name.endsWith('.yaml'))
			.map((name) => parseTermsDocument({ source: readFileSync(directory + name, 'utf8'), name }))
	);
}

/** `agreed` have accepted the terms as they stand, in German; `others` have not. */
export async function seedTermsAcceptances(
	db: NodePgDatabase,
	{ agreed, others }: { agreed: string[]; others: string[] }
) {
	await db
		.delete(schema.messagingTermsAcceptance)
		.where(inArray(schema.messagingTermsAcceptance.userId, [...agreed, ...others]));
	if (agreed.length === 0) return;
	const document = currentTerms();
	const shown = termsInLocale({ document, locale: 'de' });
	await db.insert(schema.messagingTermsAcceptance).values(
		agreed.map((userId) => ({
			userId,
			version: shown.version,
			revision: shown.revision,
			locale: shown.locale,
			contentHash: contentHash(shown),
			confirmationIds: shown.confirmations.map((confirmation) => confirmation.id)
		}))
	);
}
