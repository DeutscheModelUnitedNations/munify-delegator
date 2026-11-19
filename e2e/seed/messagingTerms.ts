import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import {
	contentHash,
	termsInLocale
} from '../../src/api/handlers/messagingTerms/messagingTermsDocument';
import { currentTermsFromFiles } from '../../src/api/handlers/messagingTerms/termsFiles';

/** `agreed` have accepted the terms as they stand, in German; `others` have not. */
export async function seedTermsAcceptances(
	db: NodePgDatabase,
	{ agreed, others }: { agreed: string[]; others: string[] }
) {
	await db
		.delete(schema.messagingTermsAcceptance)
		.where(inArray(schema.messagingTermsAcceptance.userId, [...agreed, ...others]));
	if (agreed.length === 0) return;
	const document = currentTermsFromFiles();
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
