import worldCountries from 'world-countries';
import type * as schema from '../schema';

/**
 * The `Nation` table only ever holds UN member states; `#lib/seeding/seedSchema.ts` derives the
 * codes it accepts from the same source, so the two cannot drift apart.
 */
export function unMemberNations(): (typeof schema.nation.$inferInsert)[] {
	return worldCountries
		.filter((country) => country.unMember)
		.map((country) => ({
			alpha2Code: country.cca2.toLowerCase(),
			alpha3Code: country.cca3.toLowerCase()
		}));
}
