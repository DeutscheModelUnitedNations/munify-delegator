import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { seedAcceptancesOf } from '../../src/api/handlers/messagingTerms/termsOnDisk';

/** `agreed` have accepted the terms as they stand, in German; `others` have not. */
export async function seedTermsAcceptances(
	db: NodePgDatabase,
	{ agreed, others }: { agreed: string[]; others: string[] }
) {
	await db
		.delete(schema.messagingTermsAcceptance)
		.where(inArray(schema.messagingTermsAcceptance.userId, [...agreed, ...others]));
	if (agreed.length === 0) return;
	await db.insert(schema.messagingTermsAcceptance).values(seedAcceptancesOf(agreed));
}
