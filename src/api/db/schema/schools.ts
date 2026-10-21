import { snakeCase, text } from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps, trigramIndex } from './helpers';

/**
 * Schools, shared by every conference. Applicants pick one or name a new one, which creates it;
 * the team keeps what it knows about a school (address, contact, notes) on the row.
 */
export const school = snakeCase.table(
	'school',
	{
		...defaultIdAndTimestamps,
		name: text().notNull(),
		street: text(),
		apartment: text(),
		zip: text(),
		city: text(),
		// state, province or prefecture where the country's addresses have one
		region: text(),
		// ISO 3166-1 alpha-3
		country: text(),
		website: text(),
		contactName: text(),
		contactEmail: text(),
		contactPhone: text(),
		/** The team's notes; only the team reads them. */
		notes: text()
	},
	(table) => [
		trigramIndex('school_name_trgm', table.name),
		trigramIndex('school_city_trgm', table.city)
	]
);

/** An optional reference to a school: a row without one names no school. */
export function schoolRef() {
	return text().references(() => school.id, { onDelete: 'set null', onUpdate: 'cascade' });
}
