import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	jsonb,
	integer,
	index,
	uniqueIndex,
	check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
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

/** The name a review is published under instead of the reviewer's own; `CUSTOM` is `anonymousName`. */
export const paperReviewAnonymousAs = pgEnum('paper_review_anonymous_as', [
	'SECRETARIAT',
	'RESEARCH_SERVICE',
	'CUSTOM'
]);

export const paperReview = snakeCase.table(
	'paper_review',
	{
		...defaultIdAndCreatedAt,
		comments: jsonb().notNull(),
		reviewerId: userRef('restrict'),
		paperVersionId: text()
			.notNull()
			.references(() => paperVersion.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		statusAfter: paperStatus(),
		statusBefore: paperStatus(),
		/** Set, the author reads this name instead of the reviewer's (`reviewerId` is masked). */
		anonymousAs: paperReviewAnonymousAs(),
		/** The name the reviewer typed, exactly when `anonymousAs` is `CUSTOM`. */
		anonymousName: text()
	},
	(table) => [
		// compared as text: a value added to the enum cannot be used in the migration adding it
		check(
			'paper_review_anonymous_name_iff_custom',
			sql`(${table.anonymousAs}::text is not distinct from 'CUSTOM') = (${table.anonymousName} is not null)`
		)
	]
);

/** Where a review draft was written: by an AI assistant over MCP, or by the reviewer in the app. */
export const paperReviewDraftOrigin = pgEnum('paper_review_draft_origin', ['MCP', 'UI']);

/**
 * A review not sent yet: at most one per paper and reviewer, read only by its reviewer. It never
 * reaches the paper's authors, changes no status and counts as no review; submitting the review
 * (`createPaperReview`) deletes it.
 */
export const paperReviewDraft = snakeCase.table(
	'paper_review_draft',
	{
		...defaultIdAndTimestamps,
		paperId: text()
			.notNull()
			.references(() => paper.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		reviewerId: userRef('cascade'),
		/** The version the draft was written for; a newer one makes it stale. */
		paperVersionId: text()
			.notNull()
			.references(() => paperVersion.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		/** The review editor's document, as a review's `comments`. */
		comments: jsonb().notNull(),
		statusAfter: paperStatus().notNull(),
		/** Who wrote the draft as it was created (or replaced by an assistant). */
		origin: paperReviewDraftOrigin().notNull(),
		/** Who changed it last: an assistant may not silently replace what the reviewer wrote. */
		lastEditedVia: paperReviewDraftOrigin().notNull()
	},
	(table) => [
		uniqueIndex('paper_review_draft_paper_id_reviewer_id_key').using(
			'btree',
			table.paperId.asc().nullsLast(),
			table.reviewerId.asc().nullsLast()
		),
		index('paper_review_draft_reviewer_id_idx').using('btree', table.reviewerId.asc().nullsLast()),
		check(
			'paper_review_draft_status_after_verdict',
			sql`${table.statusAfter}::text in ('CHANGES_REQUESTED', 'ACCEPTED')`
		)
	]
);

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
	committeeId: text().references(() => committee.id, { onDelete: 'set null', onUpdate: 'cascade' }),
	/** The linked CHASE's paper this resolution was adopted as; the link worker keeps it in sync. */
	chasePaperId: text().unique(),
	/** The CHASE snapshot of the adopted text the PDF was rendered from. */
	chaseSnapshotId: text()
});
