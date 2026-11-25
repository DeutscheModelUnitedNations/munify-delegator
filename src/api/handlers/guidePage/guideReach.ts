import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { schema } from '#api/db/db';

/**
 * Which conferences a guide page's scope reaches, in SQL (`#lib/guide/scope` says the same in
 * TypeScript): a conference scope its conference; the shared scopes every conference of a series,
 * of that series and that year where they name one. For the rules and the queries that list the
 * pages of a conference, filtering on the page's own columns.
 */

const reached = alias(schema.conference, 'guide_reached_conference');

/** The calendar year a conference starts in, in its own time zone (`conferenceYear`). */
export function conferenceYearSql(conference: typeof reached | typeof schema.conference) {
	return sql`extract(year from (${conference.startConference} at time zone 'UTC') at time zone ${conference.timezone})::integer`;
}

/** A scope as columns of a page or version. */
export type ScopeColumns = { seriesId: SQLWrapper; year: SQLWrapper; conferenceId: SQLWrapper };

/** The draft scope of a page. */
export const draftScope = (page: typeof schema.guidePage): ScopeColumns => ({
	seriesId: page.seriesId,
	year: page.year,
	conferenceId: page.conferenceId
});

/** The published scope of a page (copied from its published version). */
export const publishedScope = (page: typeof schema.guidePage): ScopeColumns => ({
	seriesId: page.publishedSeriesId,
	year: page.publishedYear,
	conferenceId: page.publishedConferenceId
});

/** Matches a scope that reaches at least one of `conferenceIds`; nothing for an empty list. */
export function reachesAnyOf({
	scope,
	conferenceIds
}: {
	scope: ScopeColumns;
	conferenceIds: readonly string[];
}): SQL {
	if (conferenceIds.length === 0) return sql`false`;
	const ids = sql.join(
		[...new Set(conferenceIds)].map((id) => sql`${id}`),
		sql`, `
	);
	return sql`exists (select 1 from ${schema.conference} as ${reached} where ${reached.id} in (${ids}) and (${reached.id} = ${scope.conferenceId} or (${scope.conferenceId} is null and ${reached.seriesId} is not null and (${scope.seriesId} is null or ${scope.seriesId} = ${reached.seriesId}) and (${scope.year} is null or ${scope.year} = ${conferenceYearSql(reached)}))))`;
}

/** Matches a page whose draft or published scope reaches one of the conferences. */
export function draftOrPublishedReaches({
	page,
	conferenceIds
}: {
	page: typeof schema.guidePage;
	conferenceIds: readonly string[];
}) {
	return sql`(${reachesAnyOf({ scope: draftScope(page), conferenceIds })} or (${page.publishedVersionId} is not null and ${reachesAnyOf({ scope: publishedScope(page), conferenceIds })}))`;
}

/**
 * Matches a page someone holding `editGuide` in `conferenceIds` may change: its draft reaches one
 * of them, and so does what is published of it. Nobody pulls a page out of other conferences'
 * reach without being one of them.
 */
export function editableIn({
	page,
	conferenceIds
}: {
	page: typeof schema.guidePage;
	conferenceIds: readonly string[];
}) {
	return sql`(${reachesAnyOf({ scope: draftScope(page), conferenceIds })} and (${page.publishedVersionId} is null or ${reachesAnyOf({ scope: publishedScope(page), conferenceIds })}))`;
}
