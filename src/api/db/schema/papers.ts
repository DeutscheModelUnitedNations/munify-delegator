import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	jsonb,
	integer,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { defaultIdAndCreatedAt, defaultIdAndTimestamps } from './helpers';
import { fileRef } from './storedFile';
import { userRef } from './users';
import { conferenceRef } from './conference';
import { committee, committeeAgendaItem } from './committees';
import { delegation } from './application';
import { participantRef } from './participants';

/** Papers, their versions and reviews, and resolutions. */

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

export const paper = snakeCase.table(
	'paper',
	{
		...defaultIdAndTimestamps,
		/** The author's part in the conference: a member of the delegation when they wrote it. */
		authorParticipantId: participantRef(),
		delegationId: text()
			.notNull()
			.references(() => delegation.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		status: paperStatus().default('SUBMITTED').notNull(),
		agendaItemId: text().references(() => committeeAgendaItem.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		type: paperType().notNull(),
		firstSubmittedAt: timestamp({ precision: 3 })
	},
	(table) => [
		index('paper_delegation_id_idx').using('btree', table.delegationId.asc().nullsLast()),
		index('paper_author_participant_id_idx').using(
			'btree',
			table.authorParticipantId.asc().nullsLast()
		)
	]
);

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

/** An adopted resolution, downloadable on the after-conference screen. */
export const resolution = snakeCase.table('resolution', {
	...defaultIdAndTimestamps,
	/** Shown to participants; the uploaded file's name unless given. */
	title: text().notNull(),
	/** The PDF; downloads keep the name it was uploaded with (`storedFile.fileName`). */
	fileId: fileRef().notNull(),
	conferenceId: conferenceRef('cascade'),
	/** Optional; kept as an untagged resolution when its committee is deleted. */
	committeeId: text().references(() => committee.id, { onDelete: 'set null', onUpdate: 'cascade' })
});
