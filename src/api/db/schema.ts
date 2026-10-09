import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	jsonb,
	integer,
	doublePrecision,
	date,
	boolean,
	index,
	uniqueIndex,
	check,
	type AnyPgColumn,
	type UpdateDeleteAction
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { nanoid } from '../../lib/helpers/nanoid';

/**
 * Shared column groups, mirroring munify-chase's schema helpers.
 *
 * Prisma implemented two of these behaviours in its client rather than in the database:
 * `@default(nanoid())` and `@updatedAt`. Drizzle must reproduce them at the application layer
 * (`$defaultFn` / `$onUpdate`), otherwise inserts fail on a missing id and `updatedAt` freezes
 * at its insert value. Neither emits DDL, so a schema diff cannot catch their absence.
 *
 * Ids use chase's generator (30 chars, no-look-alike alphabet) via `$lib/helpers/nanoid`.
 * Rows created before this change keep their 21-char Prisma-era ids; both are opaque text, so
 * the two formats coexist. Imported by relative path, not the `$lib` alias, because drizzle-kit
 * loads this file outside Vite - chase does the same.
 */
const defaultTimestamps = {
	createdAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
		.$onUpdate(() => new Date())
};

/**
 * A trigram index backing rumble's `search` argument (`col % term`, ordered by `col <-> term`).
 * rumble ORs the match over every text column the reader may see, so the planner can only use
 * these when all of those columns are indexed - index the whole set a table is searched by.
 * The `pg_trgm` extension has to exist before the migration creates one.
 */
function trigramIndex(name: string, column: AnyPgColumn) {
	return index(name).using('gin', sql`${column} gin_trgm_ops`);
}

const defaultIdAndTimestamps = {
	id: text()
		.$defaultFn(() => nanoid())
		.primaryKey(),
	...defaultTimestamps
};

/** PaperVersion and PaperReview are append-only: id + createdAt, no updatedAt. */
const defaultIdAndCreatedAt = {
	id: text()
		.$defaultFn(() => nanoid())
		.primaryKey(),
	createdAt: defaultTimestamps.createdAt
};

/**
 * A required reference to the conference or user a row belongs to. Every foreign key here
 * cascades on update; what differs between tables is only how a delete of the parent behaves.
 * Functions rather than shared builders, so each table gets its own column instance.
 */
const conferenceRef = (onDelete: UpdateDeleteAction) =>
	text()
		.notNull()
		.references(() => conference.id, { onDelete, onUpdate: 'cascade' });

const userRef = (onDelete: UpdateDeleteAction) =>
	text()
		.notNull()
		.references(() => user.id, { onDelete, onUpdate: 'cascade' });

/**
 * Prisma's implicit many-to-many join table: columns `a` and `b` referencing the two sides
 * (cascading both ways), unique on the pair and indexed on `b`. The index names derive from the
 * table name, as Prisma generated them.
 */
function implicitManyToMany<TName extends string>(
	name: TName,
	a: () => AnyPgColumn,
	b: () => AnyPgColumn
) {
	return snakeCase.table(
		name,
		{
			id: text()
				.$defaultFn(() => nanoid())
				.primaryKey(),
			a: text().notNull().references(a, { onDelete: 'cascade', onUpdate: 'cascade' }),
			b: text().notNull().references(b, { onDelete: 'cascade', onUpdate: 'cascade' })
		},
		(table) => [
			uniqueIndex(`${name}_ab_key`).using(
				'btree',
				table.a.asc().nullsLast(),
				table.b.asc().nullsLast()
			),
			index(`${name}_b_index`).using('btree', table.b.asc().nullsLast())
		]
	);
}

export const foodPreference = pgEnum('food_preference', ['OMNIVORE', 'VEGETARIAN', 'VEGAN']);
export const possibleDuplicateStatus = pgEnum('possible_duplicate_status', [
	'OPEN',
	'DISMISSED',
	'CONFIRMED'
]);
export const assignmentMarkEffect = pgEnum('assignment_mark_effect', [
	'WISHES_AND_SEATING',
	'SEATING_ONLY'
]);
export const assignmentExperienceEffect = pgEnum('assignment_experience_effect', [
	'WISHES_AND_SEATING',
	'SEATING_ONLY'
]);
export const administrativeStatus = pgEnum('administrative_status', ['DONE', 'PROBLEM', 'PENDING']);
/**
 * What a scan does in an attendance session: CHECK shows the person and their open points first,
 * RECORD only logs, BADGE checks and also stores an access card number before the next scan.
 */
export const attendanceSessionMode = pgEnum('attendance_session_mode', [
	'CHECK',
	'RECORD',
	'BADGE'
]);
export const teamRole = pgEnum('team_role', [
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE',
	'MEMBER',
	'REVIEWER',
	'TEAM_COORDINATOR',
	'CONTENT_LEAD'
]);
export const conferenceState = pgEnum('conference_state', [
	'PRE',
	'PARTICIPANT_REGISTRATION',
	'PREPARATION',
	'ACTIVE',
	'POST'
]);
export const gender = pgEnum('gender', ['MALE', 'FEMALE', 'DIVERSE', 'NO_STATEMENT']);
export const mediaConsentStatus = pgEnum('media_consent_status', [
	'NOT_SET',
	'ALLOWED_ALL',
	'PARTIALLY_ALLOWED',
	'NOT_ALLOWED'
]);
export const paperStatus = pgEnum('paper_status', [
	'SUBMITTED',
	'CHANGES_REQUESTED',
	'ACCEPTED',
	'DRAFT',
	'REVISED'
]);
export const paperType = pgEnum('paper_type', [
	'POSITION_PAPER',
	'WORKING_PAPER',
	'INTRODUCTION_PAPER'
]);
export const reviewHelpStatus = pgEnum('review_help_status', [
	'UNSPECIFIED',
	'HELP_NEEDED',
	'NO_HELP_WANTED'
]);
export const calendarEntryColor = pgEnum('calendar_entry_color', [
	'SESSION',
	'WORKSHOP',
	'LOGISTICS',
	'SOCIAL',
	'CEREMONY',
	'BREAK',
	'HIGHLIGHT',
	'INFO'
]);

/** What the regional distribution of a committee's seats is compared to in the seat planning. */
export const regionalBaseline = pgEnum('regional_baseline', [
	'UN_MEMBERS',
	'HUMAN_RIGHTS_COUNCIL',
	'ECOSOC',
	'SECURITY_COUNCIL',
	'MANUAL'
]);

export const committeeToNation = implicitManyToMany(
	'committee_to_nation',
	() => committee.id,
	() => nation.alpha3Code
);

export const conferenceSupervisorToDelegationMember = implicitManyToMany(
	'conference_supervisor_to_delegation_member',
	() => conferenceSupervisor.id,
	() => delegationMember.id
);

export const conferenceSupervisorToSingleParticipant = implicitManyToMany(
	'conference_supervisor_to_single_participant',
	() => conferenceSupervisor.id,
	() => singleParticipant.id
);

export const customConferenceRoleToSingleParticipant = implicitManyToMany(
	'custom_conference_role_to_single_participant',
	() => customConferenceRole.id,
	() => singleParticipant.id
);

/**
 * The assignment draft: changes the team plans on top of the live registrations, which
 * `applyAssignment` writes into them in one go. Nothing here is visible to participants, and
 * every row cascades with the registration it points at, so a withdrawn application simply drops
 * out of the draft.
 */

/** How the team rated one application during the sighting. Survives applying the draft. */
export const assignmentReview = snakeCase.table(
	'assignment_review',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		delegationId: text().references(() => delegation.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		singleParticipantId: text().references(() => singleParticipant.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		evaluation: doublePrecision(),
		flagged: boolean().default(false).notNull(),
		disqualified: boolean().default(false).notNull(),
		note: text()
	},
	(table) => [
		uniqueIndex('assignment_review_delegation_id_key').using(
			'btree',
			table.delegationId.asc().nullsLast()
		),
		uniqueIndex('assignment_review_single_participant_id_key').using(
			'btree',
			table.singleParticipantId.asc().nullsLast()
		),
		check(
			'assignment_review_one_application',
			sql`num_nonnulls(${table.delegationId}, ${table.singleParticipantId}) = 1`
		)
	]
);

/**
 * A group of people the draft gives a role (or takes one from): a whole delegation, one part of a
 * split delegation, or a single participant turned into a delegation. A delegation without any
 * unit keeps what it has.
 */
export const assignmentUnit = snakeCase.table(
	'assignment_unit',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		sourceDelegationId: text().references(() => delegation.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		sourceSingleParticipantId: text().references(() => singleParticipant.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		nationAlpha3Code: text().references(() => nation.alpha3Code, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		nonStateActorId: text().references(() => nonStateActor.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		})
	},
	(table) => [
		index('assignment_unit_conference_id_idx').using('btree', table.conferenceId.asc().nullsLast()),
		index('assignment_unit_source_delegation_id_idx').using(
			'btree',
			table.sourceDelegationId.asc().nullsLast()
		),
		uniqueIndex('assignment_unit_source_single_participant_id_key').using(
			'btree',
			table.sourceSingleParticipantId.asc().nullsLast()
		),
		check(
			'assignment_unit_one_source',
			sql`num_nonnulls(${table.sourceDelegationId}, ${table.sourceSingleParticipantId}) = 1`
		),
		check(
			'assignment_unit_one_role',
			sql`num_nonnulls(${table.nationAlpha3Code}, ${table.nonStateActorId}) <= 1`
		)
	]
);

/** The members of one part of a split delegation. A unit without members is the whole delegation. */
export const assignmentUnitMember = snakeCase.table(
	'assignment_unit_member',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		unitId: text()
			.notNull()
			.references(() => assignmentUnit.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		delegationMemberId: text()
			.notNull()
			.references(() => delegationMember.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('assignment_unit_member_delegation_member_id_key').using(
			'btree',
			table.delegationMemberId.asc().nullsLast()
		),
		index('assignment_unit_member_unit_id_idx').using('btree', table.unitId.asc().nullsLast())
	]
);

/** The custom role the draft gives a single participant; `roleId` null takes theirs away. */
export const assignmentSingleRole = snakeCase.table(
	'assignment_single_role',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		singleParticipantId: text()
			.notNull()
			.references(() => singleParticipant.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		roleId: text().references(() => customConferenceRole.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		})
	},
	(table) => [
		uniqueIndex('assignment_single_role_single_participant_id_key').using(
			'btree',
			table.singleParticipantId.asc().nullsLast()
		)
	]
);

/** The weights the automatic assignment runs with, one row per conference. */
export const assignmentWeights = snakeCase.table(
	'assignment_weights',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		/** The rating that counts as neutral; unrated applications are treated as having it. */
		nullRating: doublePrecision().default(2.5).notNull(),
		/** How strongly each star above or below the neutral rating moves the cost. */
		ratingFactor: doublePrecision().default(1).notNull(),
		/** What a flag takes off the cost. */
		markBonus: doublePrecision().default(0).notNull(),
		/** Whether a flag also scales the weight of the group's wishes. */
		markEffect: assignmentMarkEffect().default('SEATING_ONLY').notNull(),
		/** What a group of people seated at earlier conferences costs extra; negative rewards it. */
		experienceModifier: doublePrecision().default(0).notNull(),
		/** Whether the modifier also scales the weight of the group's wishes. */
		experienceEffect: assignmentExperienceEffect().default('WISHES_AND_SEATING').notNull()
	},
	(table) => [
		uniqueIndex('assignment_weights_conference_id_key').using(
			'btree',
			table.conferenceId.asc().nullsLast()
		)
	]
);

/**
 * One run of the scanner: an occasion, started by a team member and ended by them. Its id is
 * made by the client, so starting it can wait in the offline queue and be repeated safely.
 */
export const attendanceSession = snakeCase.table('attendance_session', {
	...defaultIdAndTimestamps,
	conferenceId: conferenceRef('cascade'),
	occasion: text().notNull(),
	startedAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	endedAt: timestamp({ precision: 3 }),
	createdById: userRef('restrict'),
	mode: attendanceSessionMode().default('RECORD').notNull()
});

export const attendanceEntry = snakeCase.table('attendance_entry', {
	...defaultIdAndTimestamps,
	timestamp: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	occasion: text().notNull(),
	conferenceParticipantStatusId: text()
		.notNull()
		.references(() => conferenceParticipantStatus.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	recordedById: userRef('restrict'),
	/** The scanner session the scan belongs to; empty for entries from before sessions existed. */
	sessionId: text().references(() => attendanceSession.id, {
		onDelete: 'set null',
		onUpdate: 'cascade'
	}),
	/**
	 * Whether the participant had no open issue when scanned in check mode, as it was at that
	 * moment. Empty when nothing was checked (record mode, older entries).
	 */
	checkPassed: boolean()
});

export const calendarDay = snakeCase.table(
	'calendar_day',
	{
		...defaultIdAndTimestamps,
		date: timestamp({ precision: 3 }).notNull(),
		name: text().notNull(),
		sortOrder: integer().notNull(),
		conferenceId: conferenceRef('cascade')
	},
	(table) => [
		uniqueIndex('calendar_day_conference_id_sort_order_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.sortOrder.asc().nullsLast()
		)
	]
);

export const calendarEntry = snakeCase.table('calendar_entry', {
	...defaultIdAndTimestamps,
	startTime: timestamp({ precision: 3 }).notNull(),
	endTime: timestamp({ precision: 3 }).notNull(),
	name: text().notNull(),
	description: text(),
	fontAwesomeIcon: text(),
	color: calendarEntryColor().default('SESSION').notNull(),
	room: text(),
	calendarDayId: text()
		.notNull()
		.references(() => calendarDay.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	placeId: text().references(() => place.id, { onDelete: 'set null', onUpdate: 'cascade' })
});

/** The tracks an entry runs on. Every entry runs on at least one track. */
export const calendarEntryToCalendarTrack = implicitManyToMany(
	'calendar_entry_to_calendar_track',
	() => calendarEntry.id,
	() => calendarTrack.id
);

export const calendarTrack = snakeCase.table(
	'calendar_track',
	{
		...defaultIdAndTimestamps,
		name: text().notNull(),
		description: text(),
		sortOrder: integer().notNull(),
		calendarDayId: text()
			.notNull()
			.references(() => calendarDay.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('calendar_track_calendar_day_id_sort_order_key').using(
			'btree',
			table.calendarDayId.asc().nullsLast(),
			table.sortOrder.asc().nullsLast()
		)
	]
);

/**
 * A group of school names that most likely name the same school, found by the analysis the
 * cleanup page runs. `key` is the group's sorted names as JSON, so a rerun finds the row again and
 * keeps the team's decision; a group that gains or loses a spelling is a new row.
 */
export const schoolSuggestion = snakeCase.table(
	'school_suggestion',
	{
		...defaultIdAndTimestamps,
		key: text().notNull(),
		similarity: doublePrecision().notNull(),
		/** The team decided these are different schools. */
		dismissed: boolean().default(false).notNull(),
		conferenceId: conferenceRef('cascade')
	},
	(table) => [
		uniqueIndex('school_suggestion_conference_id_key_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.key.asc().nullsLast()
		)
	]
);

/** One spelling of a suggestion, with how many participants wrote it. */
export const schoolSuggestionVariant = snakeCase.table(
	'school_suggestion_variant',
	{
		...defaultIdAndTimestamps,
		school: text().notNull(),
		sumParticipants: integer().notNull(),
		suggestionId: text()
			.notNull()
			.references(() => schoolSuggestion.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('school_suggestion_variant_suggestion_id_school_key').using(
			'btree',
			table.suggestionId.asc().nullsLast(),
			table.school.asc().nullsLast()
		)
	]
);

export const committee = snakeCase.table('committee', {
	...defaultIdAndTimestamps,
	name: text().notNull(),
	abbreviation: text().notNull(),
	conferenceId: conferenceRef('cascade'),
	numOfSeatsPerDelegation: integer().default(1).notNull(),
	resolutionHeadline: text(),
	regionalBaseline: regionalBaseline().default('UN_MEMBERS').notNull(),
	/**
	 * Target seats per UN regional group for the MANUAL baseline, in the order African,
	 * Asia-Pacific, Eastern European, Latin American and Caribbean, Western European and Others.
	 * Kept when switching to a template, so switching back restores them.
	 */
	regionalBaselineTargets: integer().array().default([]).notNull()
});

export const committeeAgendaItem = snakeCase.table('committee_agenda_item', {
	...defaultIdAndTimestamps,
	title: text().notNull(),
	teaserText: text(),
	committeeId: text()
		.notNull()
		.references(() => committee.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	reviewHelpStatus: reviewHelpStatus().default('UNSPECIFIED').notNull()
});

export const conference = snakeCase.table('conference', {
	...defaultIdAndTimestamps,
	title: text().notNull(),
	longTitle: text(),
	location: text(),
	language: text(),
	website: text(),
	endConference: timestamp({ precision: 3 }).notNull(),
	startAssignment: timestamp({ precision: 3 }).notNull(),
	startConference: timestamp({ precision: 3 }).notNull(),
	state: conferenceState().default('PRE').notNull(),
	imageDataURL: text(),
	info: text(),
	linkToPreparationGuide: text(),
	accountHolder: text(),
	bankName: text(),
	bic: text(),
	currency: text().default('EUR'),
	feeAmount: doublePrecision(),
	guardianConsentContent: text(),
	iban: text(),
	mediaConsentContent: text(),
	postalApartment: text(),
	postalCity: text(),
	postalCountry: text(),
	postalName: text(),
	postalStreet: text(),
	postalZip: text(),
	termsAndConditionsContent: text(),
	unlockPayments: boolean().default(false).notNull(),
	unlockPostals: boolean().default(false).notNull(),
	linkToPaperInbox: text(),
	contractContent: text(),
	certificateContent: text(),
	registrationDeadlineGracePeriodMinutes: integer().default(30).notNull(),
	isOpenPaperSubmission: boolean().default(false).notNull(),
	emblemDataURL: text(),
	showInfoExpanded: boolean().default(false).notNull(),
	linkToServicesPage: text(),
	linkToTeamWiki: text(),
	logoDataURL: text(),
	showCalendar: boolean().default(false).notNull(),
	timezone: text().default('Europe/Berlin').notNull(),
	/** Whether participants see the roles they were assigned. The team always does. */
	assignmentReleased: boolean().default(false).notNull(),
	assignmentReleasedAt: timestamp({ precision: 3 }),
	/** Into how many bins (by the first letter of the nation) the nametag handout is split. */
	nametagBinCount: integer().default(3).notNull()
});

export const conferenceParticipantStatus = snakeCase.table(
	'conference_participant_status',
	{
		...defaultIdAndTimestamps,
		userId: userRef('restrict'),
		conferenceId: conferenceRef('restrict'),
		paymentStatus: administrativeStatus().default('PENDING').notNull(),
		didAttend: boolean().default(false).notNull(),
		guardianConsent: administrativeStatus().default('PENDING').notNull(),
		mediaConsent: administrativeStatus().default('PENDING').notNull(),
		termsAndConditions: administrativeStatus().default('PENDING').notNull(),
		mediaConsentStatus: mediaConsentStatus().default('NOT_SET').notNull(),
		// The database column keeps the original typo; the code and the API do not.
		assignedDocumentNumber: integer('assigend_document_number'),
		accessCardId: text()
	},
	(table) => [
		// Shortened by hand: the name derived from the column list was 67 chars and
		// Postgres truncates identifiers at 63, which would leave the database and
		// this file permanently disagreeing on the index name.
		uniqueIndex('conference_participant_status_conference_id_doc_number_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.assignedDocumentNumber.asc().nullsLast()
		),
		// One card per person: Postgres lets any number of rows without a card share the NULL.
		uniqueIndex('conference_participant_status_conference_id_access_card_id_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.accessCardId.asc().nullsLast()
		),
		uniqueIndex('conference_participant_status_user_id_conference_id_key').using(
			'btree',
			table.userId.asc().nullsLast(),
			table.conferenceId.asc().nullsLast()
		)
	]
);

export const conferenceSupervisor = snakeCase.table(
	'conference_supervisor',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('restrict'),
		userId: userRef('restrict'),
		plansOwnAttendenceAtConference: boolean().notNull(),
		connectionCode: text().notNull()
	},
	(table) => [
		uniqueIndex('conference_supervisor_conference_id_connection_code_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.connectionCode.asc().nullsLast()
		),
		uniqueIndex('conference_supervisor_conference_id_user_id_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		)
	]
);

export const customConferenceRole = snakeCase.table(
	'custom_conference_role',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		name: text().notNull(),
		description: text().notNull(),
		fontAwesomeIcon: text(),
		seatAmount: integer().default(1).notNull()
	},
	(table) => [
		uniqueIndex('custom_conference_role_conference_id_name_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.name.asc().nullsLast()
		)
	]
);

export const delegation = snakeCase.table(
	'delegation',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('restrict'),
		entryCode: text().notNull(),
		applied: boolean().default(false).notNull(),
		school: text(),
		motivation: text(),
		experience: text(),
		assignedNationAlpha3Code: text().references(() => nation.alpha3Code, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		assignedNonStateActorId: text().references(() => nonStateActor.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		/**
		 * How many members the delegation has. Kept by a trigger on `delegation_member` (see the
		 * `delegation_member_count` migration), so the assignment board can ask for the delegations
		 * of one group size instead of reading them all.
		 */
		memberCount: integer().default(0).notNull()
	},
	(table) => [
		// The assignment board's pool: the delegations of one size in a conference.
		index('delegation_conference_id_member_count_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.memberCount.asc().nullsLast()
		),
		uniqueIndex('delegation_conference_id_assigned_nation_alpha3_code_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.assignedNationAlpha3Code.asc().nullsLast()
		),
		uniqueIndex('delegation_conference_id_assigned_non_state_actor_id_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.assignedNonStateActorId.asc().nullsLast()
		),
		uniqueIndex('delegation_conference_id_entry_code_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.entryCode.asc().nullsLast()
		),
		// rumble's `search` argument; see `trigramIndex`.
		trigramIndex('delegation_id_trgm', table.id),
		trigramIndex('delegation_school_trgm', table.school),
		// The management tables search these with `ilike '%word%'`, which the same indexes serve.
		trigramIndex('delegation_entry_code_trgm', table.entryCode),
		trigramIndex('delegation_motivation_trgm', table.motivation),
		trigramIndex('delegation_experience_trgm', table.experience),
		// paging through a conference's delegations, newest first
		index('delegation_conference_id_created_at_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.createdAt.desc().nullsLast()
		)
	]
);

export const delegationMember = snakeCase.table(
	'delegation_member',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('restrict'),
		delegationId: text()
			.notNull()
			.references(() => delegation.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		userId: userRef('restrict'),
		isHeadDelegate: boolean().notNull(),
		assignedCommitteeId: text().references(() => committee.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		})
	},
	(table) => [
		uniqueIndex('delegation_member_conference_id_user_id_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		),
		uniqueIndex('delegation_member_delegation_id_user_id_key').using(
			'btree',
			table.delegationId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		)
	]
);

export const nation = snakeCase.table(
	'nation',
	{
		alpha3Code: text().primaryKey(),
		alpha2Code: text().notNull(),
		...defaultTimestamps
	},
	(table) => [
		uniqueIndex('nation_alpha2_code_key').using('btree', table.alpha2Code.asc().nullsLast())
	]
);

export const nonStateActor = snakeCase.table(
	'non_state_actor',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		name: text().notNull(),
		description: text().notNull(),
		fontAwesomeIcon: text(),
		abbreviation: text().notNull(),
		seatAmount: integer().default(2).notNull()
	},
	(table) => [
		uniqueIndex('non_state_actor_conference_id_abbreviation_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.abbreviation.asc().nullsLast()
		),
		uniqueIndex('non_state_actor_conference_id_name_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.name.asc().nullsLast()
		)
	]
);

export const paper = snakeCase.table('paper', {
	...defaultIdAndTimestamps,
	authorId: userRef('restrict'),
	delegationId: text()
		.notNull()
		.references(() => delegation.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	status: paperStatus().default('SUBMITTED').notNull(),
	agendaItemId: text().references(() => committeeAgendaItem.id, {
		onDelete: 'set null',
		onUpdate: 'cascade'
	}),
	type: paperType().notNull(),
	conferenceId: conferenceRef('cascade'),
	firstSubmittedAt: timestamp({ precision: 3 })
});

export const paperReview = snakeCase.table('paper_review', {
	...defaultIdAndCreatedAt,
	comments: jsonb().notNull(),
	reviewerId: userRef('restrict'),
	paperVersionId: text()
		.notNull()
		.references(() => paperVersion.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	statusAfter: paperStatus(),
	statusBefore: paperStatus()
});

export const paperVersion = snakeCase.table(
	'paper_version',
	{
		...defaultIdAndCreatedAt,
		version: integer().notNull(),
		content: jsonb().default({}).notNull(),
		paperId: text()
			.notNull()
			.references(() => paper.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		status: paperStatus().default('DRAFT').notNull()
	},
	(table) => [
		uniqueIndex('paper_version_paper_id_version_key').using(
			'btree',
			table.paperId.asc().nullsLast(),
			table.version.asc().nullsLast()
		)
	]
);

export const paymentTransaction = snakeCase.table(
	'payment_transaction',
	{
		id: text().primaryKey(),
		amount: doublePrecision().notNull(),
		...defaultTimestamps,
		recievedAt: timestamp({ precision: 3 }),
		conferenceId: conferenceRef('restrict'),
		userId: userRef('restrict')
	},
	(table) => [trigramIndex('payment_transaction_id_trgm', table.id)]
);

export const place = snakeCase.table(
	'place',
	{
		...defaultIdAndTimestamps,
		name: text().notNull(),
		address: text(),
		latitude: doublePrecision(),
		longitude: doublePrecision(),
		directions: text(),
		info: text(),
		websiteUrl: text(),
		sitePlanDataURL: text(),
		conferenceId: conferenceRef('cascade')
	},
	(table) => [
		uniqueIndex('place_conference_id_name_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.name.asc().nullsLast()
		)
	]
);

/**
 * An adopted resolution, downloadable on the after-conference screen. The PDF is stored inline as a
 * data URL, like the conference's document templates.
 */
export const resolution = snakeCase.table('resolution', {
	...defaultIdAndTimestamps,
	/** Shown to participants; the uploaded file name unless given. */
	title: text().notNull(),
	/** The uploaded file's name, which the download keeps. */
	fileName: text().notNull(),
	content: text().notNull(),
	conferenceId: conferenceRef('cascade'),
	/** Optional; kept as an untagged resolution when its committee is deleted. */
	committeeId: text().references(() => committee.id, { onDelete: 'set null', onUpdate: 'cascade' })
});

export const reviewerSnippet = snakeCase.table(
	'reviewer_snippet',
	{
		...defaultIdAndTimestamps,
		name: text().notNull(),
		content: jsonb().notNull(),
		userId: userRef('cascade')
	},
	(table) => [
		uniqueIndex('reviewer_snippet_user_id_name_key').using(
			'btree',
			table.userId.asc().nullsLast(),
			table.name.asc().nullsLast()
		)
	]
);

export const roleApplication = snakeCase.table(
	'role_application',
	{
		...defaultIdAndTimestamps,
		nationId: text().references(() => nation.alpha3Code, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		nonStateActorId: text().references(() => nonStateActor.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		rank: integer().notNull(),
		delegationId: text()
			.notNull()
			.references(() => delegation.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('role_application_delegation_id_nation_id_key').using(
			'btree',
			table.delegationId.asc().nullsLast(),
			table.nationId.asc().nullsLast()
		),
		uniqueIndex('role_application_delegation_id_non_state_actor_id_key').using(
			'btree',
			table.delegationId.asc().nullsLast(),
			table.nonStateActorId.asc().nullsLast()
		),
		uniqueIndex('role_application_delegation_id_rank_key').using(
			'btree',
			table.delegationId.asc().nullsLast(),
			table.rank.asc().nullsLast()
		)
	]
);

export const singleParticipant = snakeCase.table(
	'single_participant',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('restrict'),
		userId: userRef('restrict'),
		applied: boolean().default(false).notNull(),
		school: text(),
		motivation: text(),
		experience: text(),
		assignedRoleId: text().references(() => customConferenceRole.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		assignmentDetails: text()
	},
	(table) => [
		uniqueIndex('single_participant_conference_id_user_id_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		),
		trigramIndex('single_participant_id_trgm', table.id),
		trigramIndex('single_participant_school_trgm', table.school),
		trigramIndex('single_participant_motivation_trgm', table.motivation),
		trigramIndex('single_participant_experience_trgm', table.experience),
		index('single_participant_conference_id_created_at_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.createdAt.desc().nullsLast()
		)
	]
);

export const surveyAnswer = snakeCase.table(
	'survey_answer',
	{
		...defaultIdAndTimestamps,
		questionId: text()
			.notNull()
			.references(() => surveyQuestion.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		userId: userRef('restrict'),
		optionId: text()
			.notNull()
			.references(() => surveyOption.id, { onDelete: 'restrict', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('survey_answer_question_id_user_id_key').using(
			'btree',
			table.questionId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		)
	]
);

export const surveyOption = snakeCase.table(
	'survey_option',
	{
		...defaultIdAndTimestamps,
		questionId: text()
			.notNull()
			.references(() => surveyQuestion.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		title: text().notNull(),
		description: text().notNull(),
		upperLimit: integer().notNull()
	},
	(table) => [
		uniqueIndex('survey_option_question_id_title_key').using(
			'btree',
			table.questionId.asc().nullsLast(),
			table.title.asc().nullsLast()
		)
	]
);

export const surveyQuestion = snakeCase.table(
	'survey_question',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('restrict'),
		title: text().notNull(),
		description: text().notNull(),
		deadline: timestamp({ precision: 3 }).notNull(),
		draft: boolean().default(true).notNull(),
		hidden: boolean().default(false).notNull(),
		showSelectionOnDashboard: boolean().default(false).notNull()
	},
	(table) => [
		uniqueIndex('survey_question_conference_id_title_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.title.asc().nullsLast()
		)
	]
);

export const teamMember = snakeCase.table(
	'team_member',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('restrict'),
		userId: userRef('restrict'),
		role: teamRole().default('MEMBER').notNull()
	},
	(table) => [
		uniqueIndex('team_member_conference_id_user_id_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		)
	]
);

export const teamMemberInvitation = snakeCase.table(
	'team_member_invitation',
	{
		...defaultIdAndTimestamps,
		email: text().notNull(),
		role: teamRole().notNull(),
		token: text().notNull(),
		expiresAt: timestamp({ precision: 3 }).notNull(),
		usedAt: timestamp({ precision: 3 }),
		revokedAt: timestamp({ precision: 3 }),
		conferenceId: conferenceRef('cascade'),
		invitedById: userRef('restrict'),
		acceptedById: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' })
	},
	(table) => [
		index('team_member_invitation_conference_id_email_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.email.asc().nullsLast()
		),
		uniqueIndex('team_member_invitation_conference_id_email_pending_key')
			.using('btree', table.conferenceId.asc().nullsLast(), table.email.asc().nullsLast())
			.where(sql`(("usedAt" IS NULL) AND ("revokedAt" IS NULL))`),
		index('team_member_invitation_conference_id_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast()
		),
		index('team_member_invitation_token_idx').using('btree', table.token.asc().nullsLast()),
		uniqueIndex('team_member_invitation_token_key').using('btree', table.token.asc().nullsLast())
	]
);

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
		// rumble's `search` argument; see `trigramIndex`. It tests every column the reader may see
		// in every row, so a reader who sees the care team's private columns (address, phone,
		// notes: the care team, system admins) searches those too. One of them without an index
		// turns the whole OR into a scan of the table (2 s for 490k users).
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

/**
 * Two accounts that may belong to one person (`$api/services/possibleDuplicates.ts` finds them),
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

export const userReferenceInPaymentTransaction = snakeCase.table(
	'user_reference_in_payment_transaction',
	{
		...defaultIdAndTimestamps,
		paymentTransactionId: text()
			.notNull()
			.references(() => paymentTransaction.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		userId: userRef('restrict')
	}
);

export const waitingListEntry = snakeCase.table(
	'waiting_list_entry',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('restrict'),
		userId: userRef('restrict'),
		school: text().notNull(),
		experience: text().notNull(),
		motivation: text().notNull(),
		requests: text(),
		assigned: boolean().default(false).notNull(),
		hidden: boolean().default(false).notNull()
	},
	(table) => [
		uniqueIndex('waiting_list_entry_conference_id_user_id_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		),
		trigramIndex('waiting_list_entry_school_trgm', table.school),
		trigramIndex('waiting_list_entry_experience_trgm', table.experience),
		trigramIndex('waiting_list_entry_motivation_trgm', table.motivation),
		trigramIndex('waiting_list_entry_requests_trgm', table.requests),
		index('waiting_list_entry_conference_id_assigned_created_at_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.assigned.asc().nullsLast(),
			table.createdAt.asc().nullsLast()
		)
	]
);

/**
 * The statistics dashboard's materialized views, created by hand in the
 * `statistics_materialized_views` migration (which documents each one) and refreshed by
 * `src/api/handlers/statistics.ts`. `.existing()` keeps drizzle-kit from managing them; a change
 * goes into a new custom migration (`drizzle-kit generate --custom`).
 */
export const statisticsPeople = snakeCase
	.materializedView('statistics_people', {
		conferenceId: text().notNull(),
		kind: text({
			enum: ['DELEGATION_MEMBER', 'SINGLE_PARTICIPANT', 'SUPERVISOR', 'TEAM_MEMBER']
		}).notNull(),
		applied: boolean().notNull(),
		hasRole: boolean().notNull(),
		hasNation: boolean().notNull(),
		hasCommittee: boolean().notNull(),
		accepted: boolean().notNull(),
		attends: boolean().notNull(),
		gender: gender(),
		foodPreference: foodPreference(),
		count: integer().notNull()
	})
	.existing();

export const statisticsDelegations = snakeCase
	.materializedView('statistics_delegations', {
		conferenceId: text().notNull(),
		applied: boolean().notNull(),
		hasRole: boolean().notNull(),
		school: text(),
		delegations: integer().notNull(),
		members: integer().notNull()
	})
	.existing();

export const statisticsRegistrationDays = snakeCase
	.materializedView('statistics_registration_days', {
		conferenceId: text().notNull(),
		day: date({ mode: 'string' }).notNull(),
		kind: text({ enum: ['DELEGATION', 'SINGLE_PARTICIPANT', 'SUPERVISOR'] }).notNull(),
		applied: boolean().notNull(),
		hasRole: boolean().notNull(),
		registrations: integer().notNull(),
		members: integer().notNull()
	})
	.existing();

export const statisticsRoleApplications = snakeCase
	.materializedView('statistics_role_applications', {
		conferenceId: text().notNull(),
		roleId: text().notNull(),
		name: text().notNull(),
		fontAwesomeIcon: text(),
		total: integer().notNull(),
		applied: integer().notNull()
	})
	.existing();

export const statisticsAges = snakeCase
	.materializedView('statistics_ages', {
		conferenceId: text().notNull(),
		categoryId: text().notNull(),
		categoryType: text({ enum: ['delegationMember', 'singleParticipant'] }).notNull(),
		roleName: text(),
		committeeId: text(),
		committeeName: text(),
		committeeAbbreviation: text(),
		applied: boolean().notNull(),
		hasRole: boolean().notNull(),
		age: integer(),
		count: integer().notNull()
	})
	.existing();

export const statisticsAddresses = snakeCase
	.materializedView('statistics_addresses', {
		conferenceId: text().notNull(),
		applied: boolean().notNull(),
		hasRole: boolean().notNull(),
		country: text(),
		zipPrefix: text(),
		count: integer().notNull()
	})
	.existing();

export const statisticsParticipantStatus = snakeCase
	.materializedView('statistics_participant_status', {
		conferenceId: text().notNull(),
		expected: boolean().notNull(),
		hasStatus: boolean().notNull(),
		paymentStatus: administrativeStatus(),
		postalDone: boolean().notNull(),
		postalProblem: boolean().notNull(),
		didAttend: boolean().notNull(),
		count: integer().notNull()
	})
	.existing();

export const statisticsCommitteeFill = snakeCase
	.materializedView('statistics_committee_fill', {
		conferenceId: text().notNull(),
		committeeId: text().notNull(),
		name: text().notNull(),
		abbreviation: text().notNull(),
		totalSeats: integer().notNull(),
		assignedSeats: integer().notNull()
	})
	.existing();

export const statisticsWaitingList = snakeCase
	.materializedView('statistics_waiting_list', {
		conferenceId: text().notNull(),
		hidden: boolean().notNull(),
		assigned: boolean().notNull(),
		count: integer().notNull()
	})
	.existing();

export const statisticsPapers = snakeCase
	.materializedView('statistics_papers', {
		conferenceId: text().notNull(),
		type: paperType().notNull(),
		status: paperStatus().notNull(),
		hasReview: boolean().notNull(),
		committeeId: text(),
		committeeName: text(),
		committeeAbbreviation: text(),
		count: integer().notNull()
	})
	.existing();

export const statisticsRefreshedAt = snakeCase
	.materializedView('statistics_refreshed_at', {
		id: integer().notNull(),
		refreshedAt: timestamp({ precision: 3, withTimezone: true }).notNull()
	})
	.existing();
