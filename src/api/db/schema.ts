import {
	pgEnum,
	pgTable,
	text,
	timestamp,
	jsonb,
	integer,
	doublePrecision,
	boolean,
	index,
	uniqueIndex,
	foreignKey,
	primaryKey
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * Shared column groups, mirroring munify-chase's schema helpers.
 *
 * Prisma implemented two of these behaviours in the client rather than in the database:
 * `@default(nanoid())` and `@updatedAt`. Drizzle has to reproduce them at the application
 * level too (`$defaultFn` / `$onUpdate`), otherwise inserts would fail on a missing id and
 * `updatedAt` would never advance past its insert value. Neither emits DDL, so they do not
 * affect the schema diff.
 *
 * `nanoid` is the package default (21 chars, default alphabet) to stay consistent with the
 * ids already in the database - deliberately not chase's 30-char no-look-alike alphabet.
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

export const foodPreference = pgEnum('FoodPreference', ['OMNIVORE', 'VEGETARIAN', 'VEGAN']);
export const administrativeStatus = pgEnum('AdministrativeStatus', ['DONE', 'PROBLEM', 'PENDING']);
export const teamRole = pgEnum('TeamRole', [
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE',
	'MEMBER',
	'REVIEWER',
	'TEAM_COORDINATOR'
]);
export const conferenceState = pgEnum('ConferenceState', [
	'PRE',
	'PARTICIPANT_REGISTRATION',
	'PREPARATION',
	'ACTIVE',
	'POST'
]);
export const gender = pgEnum('Gender', ['MALE', 'FEMALE', 'DIVERSE', 'NO_STATEMENT']);
export const mediaConsentStatus = pgEnum('MediaConsentStatus', [
	'NOT_SET',
	'ALLOWED_ALL',
	'PARTIALLY_ALLOWED',
	'NOT_ALLOWED'
]);
export const paperStatus = pgEnum('PaperStatus', [
	'SUBMITTED',
	'CHANGES_REQUESTED',
	'ACCEPTED',
	'DRAFT',
	'REVISED'
]);
export const paperType = pgEnum('PaperType', [
	'POSITION_PAPER',
	'WORKING_PAPER',
	'INTRODUCTION_PAPER'
]);
export const reviewHelpStatus = pgEnum('ReviewHelpStatus', [
	'UNSPECIFIED',
	'HELP_NEEDED',
	'NO_HELP_WANTED'
]);
export const calendarEntryColor = pgEnum('CalendarEntryColor', [
	'SESSION',
	'WORKSHOP',
	'LOGISTICS',
	'SOCIAL',
	'CEREMONY',
	'BREAK',
	'HIGHLIGHT',
	'INFO'
]);

export const committeeToNation = pgTable(
	'_CommitteeToNation',
	{
		a: text('A')
			.notNull()
			.references(() => committee.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		b: text('B')
			.notNull()
			.references(() => nation.alpha3Code, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		primaryKey({ columns: [table.a, table.b], name: '_CommitteeToNation_AB_pkey' }),
		index('_CommitteeToNation_B_index').using('btree', table.b.asc().nullsLast())
	]
);

export const conferenceSupervisorToDelegationMember = pgTable(
	'_ConferenceSupervisorToDelegationMember',
	{
		a: text('A')
			.notNull()
			.references(() => conferenceSupervisor.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		b: text('B')
			.notNull()
			.references(() => delegationMember.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		primaryKey({
			columns: [table.a, table.b],
			name: '_ConferenceSupervisorToDelegationMember_AB_pkey'
		}),
		index('_ConferenceSupervisorToDelegationMember_B_index').using(
			'btree',
			table.b.asc().nullsLast()
		)
	]
);

export const conferenceSupervisorToSingleParticipant = pgTable(
	'_ConferenceSupervisorToSingleParticipant',
	{
		a: text('A')
			.notNull()
			.references(() => conferenceSupervisor.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		b: text('B')
			.notNull()
			.references(() => singleParticipant.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		primaryKey({
			columns: [table.a, table.b],
			name: '_ConferenceSupervisorToSingleParticipant_AB_pkey'
		}),
		index('_ConferenceSupervisorToSingleParticipant_B_index').using(
			'btree',
			table.b.asc().nullsLast()
		)
	]
);

export const customConferenceRoleToSingleParticipant = pgTable(
	'_CustomConferenceRoleToSingleParticipant',
	{
		a: text('A')
			.notNull()
			.references(() => customConferenceRole.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		b: text('B')
			.notNull()
			.references(() => singleParticipant.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		primaryKey({
			columns: [table.a, table.b],
			name: '_CustomConferenceRoleToSingleParticipant_AB_pkey'
		}),
		index('_CustomConferenceRoleToSingleParticipant_B_index').using(
			'btree',
			table.b.asc().nullsLast()
		)
	]
);

export const attendanceEntry = pgTable('AttendanceEntry', {
	id: text().primaryKey(),
	timestamp: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	occasion: text().notNull(),
	conferenceParticipantStatusId: text()
		.notNull()
		.references(() => conferenceParticipantStatus.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	recordedById: text()
		.notNull()
		.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
	createdAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const calendarDay = pgTable(
	'CalendarDay',
	{
		id: text().primaryKey(),
		date: timestamp({ precision: 3 }).notNull(),
		name: text().notNull(),
		sortOrder: integer().notNull(),
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		uniqueIndex('CalendarDay_conferenceId_sortOrder_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.sortOrder.asc().nullsLast()
		)
	]
);

export const calendarEntry = pgTable('CalendarEntry', {
	id: text().primaryKey(),
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
	createdAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	placeId: text().references(() => place.id, { onDelete: 'set null', onUpdate: 'cascade' })
});

export const calendarTrack = pgTable(
	'CalendarTrack',
	{
		id: text().primaryKey(),
		name: text().notNull(),
		description: text(),
		sortOrder: integer().notNull(),
		calendarDayId: text()
			.notNull()
			.references(() => calendarDay.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		uniqueIndex('CalendarTrack_calendarDayId_sortOrder_key').using(
			'btree',
			table.calendarDayId.asc().nullsLast(),
			table.sortOrder.asc().nullsLast()
		)
	]
);

export const committee = pgTable('Committee', {
	id: text().primaryKey(),
	name: text().notNull(),
	abbreviation: text().notNull(),
	conferenceId: text()
		.notNull()
		.references(() => conference.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	numOfSeatsPerDelegation: integer().default(1).notNull(),
	createdAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	resolutionHeadline: text()
});

export const committeeAgendaItem = pgTable('CommitteeAgendaItem', {
	id: text().primaryKey(),
	title: text().notNull(),
	teaserText: text(),
	committeeId: text()
		.notNull()
		.references(() => committee.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	createdAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	reviewHelpStatus: reviewHelpStatus().default('UNSPECIFIED').notNull()
});

export const conference = pgTable('Conference', {
	id: text().primaryKey(),
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
	createdAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
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

export const conferenceParticipantStatus = pgTable(
	'ConferenceParticipantStatus',
	{
		id: text().primaryKey(),
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
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		mediaConsentStatus: mediaConsentStatus().default('NOT_SET').notNull(),
		assigendDocumentNumber: integer(),
		accessCardId: text()
	},
	(table) => [
		uniqueIndex('ConferenceParticipantStatus_conferenceId_assigendDocumentNu_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.assigendDocumentNumber.asc().nullsLast()
		),
		uniqueIndex('ConferenceParticipantStatus_userId_conferenceId_key').using(
			'btree',
			table.userId.asc().nullsLast(),
			table.conferenceId.asc().nullsLast()
		)
	]
);

export const conferenceSupervisor = pgTable(
	'ConferenceSupervisor',
	{
		id: text().primaryKey(),
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		plansOwnAttendenceAtConference: boolean().notNull(),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		connectionCode: text().notNull()
	},
	(table) => [
		uniqueIndex('ConferenceSupervisor_conferenceId_connectionCode_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.connectionCode.asc().nullsLast()
		),
		uniqueIndex('ConferenceSupervisor_conferenceId_userId_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		)
	]
);

export const customConferenceRole = pgTable(
	'CustomConferenceRole',
	{
		id: text().primaryKey(),
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		name: text().notNull(),
		description: text().notNull(),
		fontAwesomeIcon: text(),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		seatAmount: integer().default(1).notNull()
	},
	(table) => [
		uniqueIndex('CustomConferenceRole_conferenceId_name_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.name.asc().nullsLast()
		)
	]
);

export const delegation = pgTable(
	'Delegation',
	{
		id: text().primaryKey(),
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
		}),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		uniqueIndex('Delegation_conferenceId_assignedNationAlpha3Code_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.assignedNationAlpha3Code.asc().nullsLast()
		),
		uniqueIndex('Delegation_conferenceId_assignedNonStateActorId_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.assignedNonStateActorId.asc().nullsLast()
		),
		uniqueIndex('Delegation_conferenceId_entryCode_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.entryCode.asc().nullsLast()
		)
	]
);

export const delegationMember = pgTable(
	'DelegationMember',
	{
		id: text().primaryKey(),
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
		}),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		uniqueIndex('DelegationMember_conferenceId_userId_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		),
		uniqueIndex('DelegationMember_delegationId_userId_key').using(
			'btree',
			table.delegationId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		)
	]
);

export const nation = pgTable(
	'Nation',
	{
		alpha3Code: text().primaryKey(),
		alpha2Code: text().notNull(),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		uniqueIndex('Nation_alpha2Code_key').using('btree', table.alpha2Code.asc().nullsLast())
	]
);

export const nonStateActor = pgTable(
	'NonStateActor',
	{
		id: text().primaryKey(),
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		name: text().notNull(),
		description: text().notNull(),
		fontAwesomeIcon: text(),
		abbreviation: text().notNull(),
		seatAmount: integer().default(2).notNull(),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		uniqueIndex('NonStateActor_conferenceId_abbreviation_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.abbreviation.asc().nullsLast()
		),
		uniqueIndex('NonStateActor_conferenceId_name_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.name.asc().nullsLast()
		)
	]
);

export const paper = pgTable('Paper', {
	id: text().primaryKey(),
	authorId: text()
		.notNull()
		.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
	delegationId: text()
		.notNull()
		.references(() => delegation.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	createdAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
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

export const paperReview = pgTable('PaperReview', {
	id: text().primaryKey(),
	comments: jsonb().notNull(),
	reviewerId: text()
		.notNull()
		.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
	createdAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	paperVersionId: text()
		.notNull()
		.references(() => paperVersion.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	statusAfter: paperStatus(),
	statusBefore: paperStatus()
});

export const paperVersion = pgTable(
	'PaperVersion',
	{
		id: text().primaryKey(),
		version: integer().notNull(),
		content: jsonb().default({}).notNull(),
		paperId: text()
			.notNull()
			.references(() => paper.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		status: paperStatus().default('DRAFT').notNull()
	},
	(table) => [
		uniqueIndex('PaperVersion_paperId_version_key').using(
			'btree',
			table.paperId.asc().nullsLast(),
			table.version.asc().nullsLast()
		)
	]
);

export const paymentTransaction = pgTable('PaymentTransaction', {
	id: text().primaryKey(),
	amount: doublePrecision().notNull(),
	createdAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	recievedAt: timestamp({ precision: 3 }),
	conferenceId: text()
		.notNull()
		.references(() => conference.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
	userId: text()
		.notNull()
		.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
	updatedAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const place = pgTable(
	'Place',
	{
		id: text().primaryKey(),
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
			.references(() => conference.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		uniqueIndex('Place_conferenceId_name_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.name.asc().nullsLast()
		)
	]
);

export const reviewerSnippet = pgTable(
	'ReviewerSnippet',
	{
		id: text().primaryKey(),
		name: text().notNull(),
		content: jsonb().notNull(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		uniqueIndex('ReviewerSnippet_userId_name_key').using(
			'btree',
			table.userId.asc().nullsLast(),
			table.name.asc().nullsLast()
		)
	]
);

export const roleApplication = pgTable(
	'RoleApplication',
	{
		id: text().primaryKey(),
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
			.references(() => delegation.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		uniqueIndex('RoleApplication_delegationId_nationId_key').using(
			'btree',
			table.delegationId.asc().nullsLast(),
			table.nationId.asc().nullsLast()
		),
		uniqueIndex('RoleApplication_delegationId_nonStateActorId_key').using(
			'btree',
			table.delegationId.asc().nullsLast(),
			table.nonStateActorId.asc().nullsLast()
		),
		uniqueIndex('RoleApplication_delegationId_rank_key').using(
			'btree',
			table.delegationId.asc().nullsLast(),
			table.rank.asc().nullsLast()
		)
	]
);

export const singleParticipant = pgTable(
	'SingleParticipant',
	{
		id: text().primaryKey(),
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
		assignmentDetails: text(),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		uniqueIndex('SingleParticipant_conferenceId_userId_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		)
	]
);

export const surveyAnswer = pgTable(
	'SurveyAnswer',
	{
		id: text().primaryKey(),
		questionId: text()
			.notNull()
			.references(() => surveyQuestion.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		optionId: text()
			.notNull()
			.references(() => surveyOption.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		uniqueIndex('SurveyAnswer_questionId_userId_key').using(
			'btree',
			table.questionId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		)
	]
);

export const surveyOption = pgTable(
	'SurveyOption',
	{
		id: text().primaryKey(),
		questionId: text()
			.notNull()
			.references(() => surveyQuestion.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		title: text().notNull(),
		description: text().notNull(),
		upperLimit: integer().notNull(),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		uniqueIndex('SurveyOption_questionId_title_key').using(
			'btree',
			table.questionId.asc().nullsLast(),
			table.title.asc().nullsLast()
		)
	]
);

export const surveyQuestion = pgTable(
	'SurveyQuestion',
	{
		id: text().primaryKey(),
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		title: text().notNull(),
		description: text().notNull(),
		deadline: timestamp({ precision: 3 }).notNull(),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		draft: boolean().default(true).notNull(),
		hidden: boolean().default(false).notNull(),
		showSelectionOnDashboard: boolean().default(false).notNull()
	},
	(table) => [
		uniqueIndex('SurveyQuestion_conferenceId_title_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.title.asc().nullsLast()
		)
	]
);

export const teamMember = pgTable(
	'TeamMember',
	{
		id: text().primaryKey(),
		conferenceId: text()
			.notNull()
			.references(() => conference.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		role: teamRole().default('MEMBER').notNull(),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		uniqueIndex('TeamMember_conferenceId_userId_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		)
	]
);

export const teamMemberInvitation = pgTable(
	'TeamMemberInvitation',
	{
		id: text().primaryKey(),
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
		acceptedById: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' }),
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		index('TeamMemberInvitation_conferenceId_email_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.email.asc().nullsLast()
		),
		uniqueIndex('TeamMemberInvitation_conferenceId_email_pending_key')
			.using('btree', table.conferenceId.asc().nullsLast(), table.email.asc().nullsLast())
			.where(sql`(("usedAt" IS NULL) AND ("revokedAt" IS NULL))`),
		index('TeamMemberInvitation_conferenceId_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast()
		),
		index('TeamMemberInvitation_token_idx').using('btree', table.token.asc().nullsLast()),
		uniqueIndex('TeamMemberInvitation_token_key').using('btree', table.token.asc().nullsLast())
	]
);

export const user = pgTable(
	'User',
	{
		id: text().primaryKey(),
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
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		emergencyContacts: text(),
		globalNotes: text()
	},
	(table) => [uniqueIndex('User_email_key').using('btree', table.email.asc().nullsLast())]
);

export const userReferenceInPaymentTransaction = pgTable('UserReferenceInPaymentTransaction', {
	id: text().primaryKey(),
	paymentTransactionId: text()
		.notNull()
		.references(() => paymentTransaction.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
	userId: text()
		.notNull()
		.references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
	createdAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const waitingListEntry = pgTable(
	'WaitingListEntry',
	{
		id: text().primaryKey(),
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
		createdAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		assigned: boolean().default(false).notNull(),
		hidden: boolean().default(false).notNull()
	},
	(table) => [
		uniqueIndex('WaitingListEntry_conferenceId_userId_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		)
	]
);
