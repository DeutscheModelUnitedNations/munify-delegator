import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	doublePrecision,
	date,
	boolean,
	index,
	uniqueIndex,
	type UpdateDeleteAction
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps, trigramIndex } from './helpers';

/** Accounts and what belongs to a person across conferences. */

/** A required reference to the user a row belongs to; see `conferenceRef`. */
export function userRef(onDelete: UpdateDeleteAction) {
	return text()
		.notNull()
		.references(() => user.id, { onDelete, onUpdate: 'cascade' });
}

export const gender = pgEnum('gender', ['MALE', 'FEMALE', 'DIVERSE', 'NO_STATEMENT']);

export const foodPreference = pgEnum('food_preference', ['OMNIVORE', 'VEGETARIAN', 'VEGAN']);

/*
 * TODO(privacy): there is no deletion or retention path for accounts. Nothing deletes or
 * anonymises a user, so the address, birthday, phone, emergency contacts, gender, food preference
 * and care notes (`globalNotes`) of everybody who ever signed in - minors among them - stay for
 * good. A system holding minors' data is expected to have both a retention rule and a way to
 * honour a deletion request (GDPR Art. 17).
 *
 * What stands in the way today: the foreign keys refuse deleting a user while anything points at
 * them with `restrict`:
 *   - `conferenceParticipant.userId` (participants.ts), and through the participant row
 *     `paper.authorParticipantId`, `paymentTransaction.payerParticipantId`, the payments a
 *     transaction covers and survey answers
 *   - `waitingListEntry.userId` (registration.ts)
 *   - `teamMember.userId`, `teamMemberInvitation.invitedById` (team.ts)
 *   - `paperReview.reviewerId` (papers.ts)
 *   - `attendanceSession.createdById`, `attendanceEntry.recordedById` (attendance.ts)
 * `possibleDuplicate`, `searchHistory`, `emailLog` and the like cascade; `storedFile.uploadedById`,
 * `teamMemberInvitation.acceptedById` and `possibleDuplicate.decidedById` are set null. Copies
 * outside these keys survive a deletion: `emailLog.email` keeps the address a mail went to,
 * `searchHistory.label` the name somebody was found by, Listmonk the subscriber (the mail sync
 * releases it once the user is gone), and the OIDC provider the account itself.
 *
 * Decide the policy first, then shape the schema after it:
 *   1. Retention: e.g. anonymise participants N years after the end of their last conference,
 *      delete accounts that never applied (no participant row, no waiting list entry, no team
 *      role) after M months of inactivity, and drop care notes sooner than the rest. A job in
 *      `src/jobs/` (like `invitation-cleanup`) runs it, with `--dry-run`.
 *   2. Anonymise rather than delete where history must stay (certificates, payments, papers,
 *      statistics): overwrite the personal columns of this table with placeholders and null the
 *      optional ones, keep the id so every `restrict` reference stays valid, clear the copies
 *      listed above, and mark the row (e.g. an `anonymisedAt` column) so login, mail sync and the
 *      duplicate scan skip it. Certificates already issued stay verifiable through their JWT.
 *   3. Deletion on request: a mutation for the account itself and for system admins that runs the
 *      same anonymisation at once (or deletes outright when nothing references the row), plus the
 *      OIDC provider's account through its management API.
 *   4. Revisit the `restrict` references above: team-side actors (reviewer, scanner, inviter) could
 *      become `set null` like `uploadedById`, so a team member can leave without blocking anything.
 */
export const user = snakeCase.table(
	'user',
	{
		...defaultIdAndTimestamps,
		email: text().notNull(),
		familyName: text('family_name').notNull(),
		givenName: text('given_name').notNull(),
		locale: text().notNull(),
		preferredUsername: text('preferred_username').notNull(),
		// a calendar day: the `Date` scalar carries it as YYYY-MM-DD, read as UTC midnight
		birthday: date({ mode: 'date' }),
		phone: text(),
		street: text(),
		apartment: text(),
		zip: text(),
		city: text(),
		// state, province or prefecture where the country's addresses have one (rumble's AddressInput)
		region: text(),
		// ISO 3166-1 alpha-3
		country: text(),
		pronouns: text(),
		foodPreference: foodPreference(),
		wantsToReceiveGeneralInformation: boolean().default(false).notNull(),
		wantsJoinTeamInformation: boolean().default(false).notNull(),
		gender: gender(),
		emergencyContacts: text(),
		globalNotes: text()
	},
	(table) => [
		uniqueIndex('user_email_key').using('btree', table.email.asc().nullsLast()),
		trigramIndex('user_id_trgm', table.id),
		trigramIndex('user_email_trgm', table.email),
		trigramIndex('user_given_name_trgm', table.givenName),
		trigramIndex('user_family_name_trgm', table.familyName),
		trigramIndex('user_preferred_username_trgm', table.preferredUsername),
		trigramIndex('user_locale_trgm', table.locale),
		trigramIndex('user_pronouns_trgm', table.pronouns),
		trigramIndex('user_street_trgm', table.street),
		trigramIndex('user_apartment_trgm', table.apartment),
		trigramIndex('user_zip_trgm', table.zip),
		trigramIndex('user_city_trgm', table.city),
		trigramIndex('user_region_trgm', table.region),
		trigramIndex('user_country_trgm', table.country),
		trigramIndex('user_phone_trgm', table.phone),
		trigramIndex('user_emergency_contacts_trgm', table.emergencyContacts),
		trigramIndex('user_global_notes_trgm', table.globalNotes)
	]
);

export const possibleDuplicateStatus = pgEnum('possible_duplicate_status', [
	'OPEN',
	'DISMISSED',
	'CONFIRMED'
]);

/**
 * Two accounts that may belong to one person (`#api/handlers/possibleDuplicate/possibleDuplicates.js` finds them),
 * so a care note on the old one is not lost to a fresh signup. Stored rather than computed on
 * read so a dismissal sticks and a re-scan only refreshes the score. `userId` is the smaller of the
 * two ids, so each pair has one row.
 */
export const possibleDuplicate = snakeCase.table(
	'possible_duplicate',
	{
		...defaultIdAndTimestamps,
		userId: userRef('cascade'),
		candidateId: userRef('cascade'),
		score: doublePrecision().notNull(),
		/** `MatchReason`s: which signals the two accounts share */
		reasons: text().array().notNull(),
		status: possibleDuplicateStatus().notNull().default('OPEN'),
		decidedById: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' }),
		decidedAt: timestamp({ precision: 3 })
	},
	(table) => [
		uniqueIndex('possible_duplicate_user_id_candidate_id_key').on(table.userId, table.candidateId),
		index('possible_duplicate_candidate_id_idx').on(table.candidateId)
	]
);
