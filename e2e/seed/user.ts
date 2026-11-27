import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/api/db/schema';

/**
 * What the my-account form schema asks for, or every login lands on /my-account (see
 * upsertActorUser in seed.ts). The address is whole: `makeSeedUser` draws the zip for the country
 * it picked, four digits for Austria or Switzerland, which a German one is not.
 */
export const COMPLETE_PROFILE = {
	country: 'DEU',
	street: 'Teststraße 1',
	zip: '24103',
	city: 'Kiel',
	phone: '+4917612345678',
	emergencyContacts: 'Emergency contact: +49 176 12345678'
};

/** Writes the users with `<id>@e2e.test` as their email, replacing whatever a run left. */
export async function upsertUsers(db: NodePgDatabase, users: (typeof schema.user.$inferInsert)[]) {
	for (const user of users) {
		const row = { ...user, email: `${user.id}@e2e.test` };
		await db
			.insert(schema.user)
			.values(row)
			.onConflictDoUpdate({ target: schema.user.id, set: row });
	}
}
