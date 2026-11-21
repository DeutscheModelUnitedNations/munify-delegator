import {
	snakeCase,
	pgEnum,
	text,
	integer,
	jsonb,
	timestamp,
	index,
	uniqueIndex,
	check,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { defaultIdAndCreatedAt, defaultIdAndTimestamps } from './helpers';
import { conference, conferenceRef, seriesRef } from './conference';
import { committee, committeeAgendaItem } from './committees';
import { fileRef } from './storedFile';
import { user } from './users';

/**
 * The preparation guide (`docs/plans/guide.md`): pages the team writes once and shares between
 * conferences, and per conference a sidebar (`guideOutline`) picking the pages its participants read.
 */

/** What a page is about: anything, or the guide page of one committee or one agenda item. */
export const guidePageKind = pgEnum('guide_page_kind', ['GENERAL', 'COMMITTEE', 'AGENDA_ITEM']);

/**
 * Who changed a row: an assistant over MCP, or a person in the app (like review drafts). Kept for
 * the team's information only.
 */
const editorRef = () =>
	text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' });

/**
 * The scope check shared by pages and their versions: everywhere (all null), one year, one series
 * or one conference.
 */
function scopeCheck({
	name,
	seriesId,
	year,
	conferenceId
}: {
	name: string;
	seriesId: AnyPgColumn;
	year: AnyPgColumn;
	conferenceId: AnyPgColumn;
}) {
	return check(name, sql`num_nonnulls(${seriesId}, ${year}, ${conferenceId}) <= 1`);
}

/**
 * A guide page, holding its draft. What participants read is its published version
 * (`publishedVersionId`); the published scope is copied here so "which published pages reach this
 * conference" is one indexed query.
 */
export const guidePage = snakeCase.table(
	'guide_page',
	{
		...defaultIdAndTimestamps,
		kind: guidePageKind().default('GENERAL').notNull(),
		/** The draft's scope: at most one of the three is set (`guide_page_scope`). */
		seriesId: seriesRef(),
		year: integer(),
		conferenceId: text().references(() => conference.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		/** The committee a `COMMITTEE` page belongs to; it goes with the committee. */
		committeeId: text().references(() => committee.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		/** The agenda item an `AGENDA_ITEM` page belongs to; it goes with the agenda item. */
		agendaItemId: text().references(() => committeeAgendaItem.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		title: text().notNull(),
		/** The draft, a TipTap document (`#lib/guide/document`). */
		content: jsonb().notNull(),
		draftUpdatedAt: timestamp({ precision: 3 })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		draftUpdatedById: editorRef(),
		publishedVersionId: text().references((): AnyPgColumn => guidePageVersion.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		/** The published version's scope, copied here (`publishedVersionId`). */
		publishedSeriesId: seriesRef(),
		publishedYear: integer(),
		publishedConferenceId: text().references(() => conference.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		})
	},
	(table) => [
		scopeCheck({
			name: 'guide_page_scope',
			seriesId: table.seriesId,
			year: table.year,
			conferenceId: table.conferenceId
		}),
		scopeCheck({
			name: 'guide_page_published_scope',
			seriesId: table.publishedSeriesId,
			year: table.publishedYear,
			conferenceId: table.publishedConferenceId
		}),
		// committee and agenda item pages belong to one conference and name their row
		check(
			'guide_page_kind_owner',
			sql`(${table.kind} = 'GENERAL' and ${table.committeeId} is null and ${table.agendaItemId} is null)
				or (${table.kind} = 'COMMITTEE' and ${table.committeeId} is not null and ${table.agendaItemId} is null and ${table.conferenceId} is not null)
				or (${table.kind} = 'AGENDA_ITEM' and ${table.agendaItemId} is not null and ${table.committeeId} is null and ${table.conferenceId} is not null)`
		),
		uniqueIndex('guide_page_committee_id_key').on(table.committeeId),
		uniqueIndex('guide_page_agenda_item_id_key').on(table.agendaItemId),
		index('guide_page_conference_id_idx').on(table.conferenceId),
		index('guide_page_series_id_idx').on(table.seriesId),
		index('guide_page_published_conference_id_idx').on(table.publishedConferenceId),
		index('guide_page_published_series_id_idx').on(table.publishedSeriesId)
	]
);

/** A published state of a page, kept to read and restore. Append-only. */
export const guidePageVersion = snakeCase.table(
	'guide_page_version',
	{
		...defaultIdAndCreatedAt,
		pageId: text()
			.notNull()
			.references((): AnyPgColumn => guidePage.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		/** 1, 2, … per page. */
		number: integer().notNull(),
		title: text().notNull(),
		content: jsonb().notNull(),
		seriesId: seriesRef(),
		year: integer(),
		conferenceId: text().references(() => conference.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		publishedById: editorRef(),
		/** Agenda item pages: the committee text rendered from this version (Typst). */
		pdfFileId: fileRef()
	},
	(table) => [
		scopeCheck({
			name: 'guide_page_version_scope',
			seriesId: table.seriesId,
			year: table.year,
			conferenceId: table.conferenceId
		}),
		uniqueIndex('guide_page_version_page_id_number_key').on(table.pageId, table.number)
	]
);

/**
 * A conference's sidebar: which pages its participants read, in which sections, for whom
 * (`#lib/guide/outline`). One document, a draft and the published one.
 */
export const guideOutline = snakeCase.table('guide_outline', {
	...defaultIdAndTimestamps,
	conferenceId: conferenceRef('cascade').unique(),
	draft: jsonb().notNull(),
	draftUpdatedById: editorRef(),
	published: jsonb(),
	publishedAt: timestamp({ precision: 3 }),
	publishedById: editorRef()
});

/** Every published sidebar of a conference. Append-only. */
export const guideOutlineVersion = snakeCase.table(
	'guide_outline_version',
	{
		...defaultIdAndCreatedAt,
		outlineId: text()
			.notNull()
			.references(() => guideOutline.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		number: integer().notNull(),
		outline: jsonb().notNull(),
		publishedById: editorRef()
	},
	(table) => [
		uniqueIndex('guide_outline_version_outline_id_number_key').on(table.outlineId, table.number)
	]
);

/**
 * The files a page's text names (`file:<id>` in images and downloads, and the committee text a
 * publish rendered): the reference that keeps the `file-cleanup` job off them, which knows a file
 * in use only by a foreign key. Kept while the page is, since its versions may still name a file
 * its draft dropped.
 */
export const guidePageFile = snakeCase.table(
	'guide_page_file',
	{
		...defaultIdAndCreatedAt,
		pageId: text()
			.notNull()
			.references(() => guidePage.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		fileId: fileRef().notNull()
	},
	(table) => [
		uniqueIndex('guide_page_file_page_id_file_id_key').on(table.pageId, table.fileId),
		index('guide_page_file_file_id_idx').on(table.fileId)
	]
);
