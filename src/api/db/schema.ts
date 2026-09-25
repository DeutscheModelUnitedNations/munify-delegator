import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	jsonb,
	integer,
	doublePrecision,
	boolean,
	index,
	uniqueIndex
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

export const foodPreference = pgEnum('food_preference', ['OMNIVORE', 'VEGETARIAN', 'VEGAN']);
export const administrativeStatus = pgEnum('administrative_status', ['DONE', 'PROBLEM', 'PENDING']);
export const teamRole = pgEnum('team_role', [
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE',
	'MEMBER',
	'REVIEWER',
	'TEAM_COORDINATOR'
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

export const committeeToNation = snakeCase.table(
	'committee_to_nation',
	{
		id: text()
			.$defaultFn(() => nanoid())
			.primaryKey(),
		a: text()
			.notNull()
			.references(() => committee.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		b: text()
			.notNull()
			.references(() => nation.alpha3Code, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('committee_to_nation_ab_key').using(
			'btree',
			table.a.asc().nullsLast(),
			table.b.asc().nullsLast()
		),
		index('committee_to_nation_b_index').using('btree', table.b.asc().nullsLast())
	]
);

export const conferenceSupervisorToDelegationMember = snakeCase.table(
	'conference_supervisor_to_delegation_member',
	{
		id: text()
			.$defaultFn(() => nanoid())
			.primaryKey(),
		a: text()
			.notNull()
			.references(() => conferenceSupervisor.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		b: text()
			.notNull()
			.references(() => delegationMember.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('conference_supervisor_to_delegation_member_ab_key').using(
			'btree',
			table.a.asc().nullsLast(),
			table.b.asc().nullsLast()
		),
		index('conference_supervisor_to_delegation_member_b_index').using(
			'btree',
			table.b.asc().nullsLast()
		)
	]
);

export const conferenceSupervisorToSingleParticipant = snakeCase.table(
	'conference_supervisor_to_single_participant',
	{
		id: text()
			.$defaultFn(() => nanoid())
			.primaryKey(),
		a: text()
			.notNull()
			.references(() => conferenceSupervisor.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		b: text()
			.notNull()
			.references(() => singleParticipant.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('conference_supervisor_to_single_participant_ab_key').using(
			'btree',
			table.a.asc().nullsLast(),
			table.b.asc().nullsLast()
		),
		index('conference_supervisor_to_single_participant_b_index').using(
			'btree',
			table.b.asc().nullsLast()
		)
	]
);

export const customConferenceRoleToSingleParticipant = snakeCase.table(
	'custom_conference_role_to_single_participant',
	{
		id: text()
			.$defaultFn(() => nanoid())
			.primaryKey(),
		a: text()
			.notNull()
			.references(() => customConferenceRole.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		b: text()
			.notNull()
			.references(() => singleParticipant.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('custom_conference_role_to_single_participant_ab_key').using(
			'btree',
			table.a.asc().nullsLast(),
			table.b.asc().nullsLast()
		),
		index('custom_conference_role_to_single_participant_b_index').using(
			'btree',
			table.b.asc().nullsLast()
		)
	]
);

export const attendanceEntry = snakeCase.table('attendance_entry', {
	...defaultIdAndTimestamps,
	timestamp: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	occasion: text().notNull(),
	conferenceParticipantStatusId: text()
		.notNull()
		.references(() => conferenceParticipantStatus.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	recordedById: text()
		.notNull()
		.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' })
});

export const calendarDay = snakeCase.table(
	'calendar_day',
	{
		...defaultIdAndTimestamps,
		date: timestamp({ precision: 3 }).notNull(),
		name: text().notNull(),
		sortOrder: integer().notNull(),
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'cascade', onUpdate: 'cascade' })
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
	calendarTrackId: text().references(() => calendarTrack.id, {
		onDelete: 'set null',
		onUpdate: 'cascade'
	}),
	placeId: text().references(() => place.id, { onDelete: 'set null', onUpdate: 'cascade' })
});

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

export const committee = snakeCase.table('committee', {
	...defaultIdAndTimestamps,
	name: text().notNull(),
	abbreviation: text().notNull(),
	conferenceId: text()
		.notNull()
		.references(() => conference.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	numOfSeatsPerDelegation: integer().default(1).notNull(),
	resolutionHeadline: text()
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
	timezone: text().default('Europe/Berlin').notNull()
});

export const conferenceParticipantStatus = snakeCase.table(
	'conference_participant_status',
	{
		...defaultIdAndTimestamps,
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		paymentStatus: administrativeStatus().default('PENDING').notNull(),
		didAttend: boolean().default(false).notNull(),
		guardianConsent: administrativeStatus().default('PENDING').notNull(),
		mediaConsent: administrativeStatus().default('PENDING').notNull(),
		termsAndConditions: administrativeStatus().default('PENDING').notNull(),
		mediaConsentStatus: mediaConsentStatus().default('NOT_SET').notNull(),
		assigendDocumentNumber: integer(),
		accessCardId: text()
	},
	(table) => [
		// Shortened by hand: the name derived from the column list was 67 chars and
		// Postgres truncates identifiers at 63, which would leave the database and
		// this file permanently disagreeing on the index name.
		uniqueIndex('conference_participant_status_conference_id_doc_number_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.assigendDocumentNumber.asc().nullsLast()
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
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
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
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
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
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
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
		})
	},
	(table) => [
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
		)
	]
);

export const delegationMember = snakeCase.table(
	'delegation_member',
	{
		...defaultIdAndTimestamps,
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		delegationId: text()
			.notNull()
			.references(() => delegation.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
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
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
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
	authorId: text()
		.notNull()
		.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
	delegationId: text()
		.notNull()
		.references(() => delegation.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	status: paperStatus().default('SUBMITTED').notNull(),
	agendaItemId: text().references(() => committeeAgendaItem.id, {
		onDelete: 'set null',
		onUpdate: 'cascade'
	}),
	type: paperType().notNull(),
	conferenceId: text()
		.notNull()
		.references(() => conference.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	firstSubmittedAt: timestamp({ precision: 3 })
});

export const paperReview = snakeCase.table('paper_review', {
	...defaultIdAndCreatedAt,
	comments: jsonb().notNull(),
	reviewerId: text()
		.notNull()
		.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
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

export const paymentTransaction = snakeCase.table('payment_transaction', {
	id: text().primaryKey(),
	amount: doublePrecision().notNull(),
	...defaultTimestamps,
	recievedAt: timestamp({ precision: 3 }),
	conferenceId: text()
		.notNull()
		.references(() => conference.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
	userId: text()
		.notNull()
		.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' })
});

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
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('place_conference_id_name_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.name.asc().nullsLast()
		)
	]
);

export const reviewerSnippet = snakeCase.table(
	'reviewer_snippet',
	{
		...defaultIdAndTimestamps,
		name: text().notNull(),
		content: jsonb().notNull(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' })
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
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
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
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
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
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
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
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
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
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		invitedById: text()
			.notNull()
			.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
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
		birthday: timestamp({ precision: 3 }),
		phone: text(),
		street: text(),
		apartment: text(),
		zip: text(),
		city: text(),
		country: text(),
		pronouns: text(),
		foodPreference: foodPreference(),
		wantsToReceiveGeneralInformation: boolean().default(false).notNull(),
		wantsJoinTeamInformation: boolean().default(false).notNull(),
		gender: gender(),
		emergencyContacts: text(),
		globalNotes: text()
	},
	(table) => [uniqueIndex('user_email_key').using('btree', table.email.asc().nullsLast())]
);

export const userReferenceInPaymentTransaction = snakeCase.table(
	'user_reference_in_payment_transaction',
	{
		...defaultIdAndTimestamps,
		paymentTransactionId: text()
			.notNull()
			.references(() => paymentTransaction.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' })
	}
);

export const waitingListEntry = snakeCase.table(
	'waiting_list_entry',
	{
		...defaultIdAndTimestamps,
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
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
		)
	]
);
