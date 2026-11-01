import { z } from 'zod';
import { db } from '#api/db/db';
import codenmz from '#lib/helpers/codenamize';
import { m } from '#lib/paraglide/messages';
import {
	applicationIdsSql,
	deckSchema,
	deckSql,
	entriesSql,
	schoolRowSchema,
	schoolsSql,
	type SchoolFilter,
	type SightingStatusFilter
} from './sightingDeckQuery';

const MAX_WINDOW = 200;
const MAX_ENTRIES = 100;
const MAX_NAME_MATCHES = 50;
const MAX_SCHOOLS = 50;

// The defaults of arguments left out are applied by the functions below, not by a transform:
// the validation is skipped for an argument left out or null.

/** How many cards the deck's window holds, at most `MAX_WINDOW`. */
export const deckSizeSchema = z
	.int()
	.min(1, { error: () => m.pageLimitRange({ max: MAX_WINDOW }) })
	.max(MAX_WINDOW, { error: () => m.pageLimitRange({ max: MAX_WINDOW }) });

/** The applications `sightingEntries` looks at: at most `MAX_ENTRIES`. */
export const entryIdsSchema = z
	.array(z.string())
	.max(MAX_ENTRIES, { error: () => m.idListTooLong({ max: MAX_ENTRIES }) });

/** How many schools the school filter offers, at most `MAX_SCHOOLS`. */
export const schoolLimitSchema = z
	.int()
	.min(1, { error: () => m.pageLimitRange({ max: MAX_SCHOOLS }) })
	.max(MAX_SCHOOLS, { error: () => m.pageLimitRange({ max: MAX_SCHOOLS }) });

/**
 * The window of the filtered deck around the card on top (`deckSql`): all applications when no
 * status is given, 60 cards when no size is.
 */
export async function loadSightingDeck({
	status,
	size,
	...options
}: Omit<Parameters<typeof deckSql>[0], 'status' | 'size'> & {
	status: SightingStatusFilter | null | undefined;
	size: number | null | undefined;
}) {
	const result = await db.execute<{ result: unknown }>(
		deckSql({ ...options, status: status ?? 'all', size: size ?? 60 })
	);
	return deckSchema.parse(result.rows[0]?.result);
}

const entrySchema = deckSchema.shape.current.unwrap();

/** The deck entries among `ids` that pass the filters (all statuses when none is given), in deck order. */
export async function loadSightingEntries({
	conferenceId,
	ids,
	status,
	school
}: {
	conferenceId: string;
	ids: readonly string[];
	status: SightingStatusFilter | null | undefined;
	school: SchoolFilter;
}) {
	if (ids.length === 0) return [];
	const result = await db.execute<{ result: unknown }>(
		entriesSql({ conferenceId, ids, status: status ?? 'all', school })
	);
	return result.rows.map((row) => entrySchema.parse(row.result));
}

/**
 * The conference's applications under review whose codename or id contains the search, at most
 * `MAX_NAME_MATCHES`. Codenames are worked out from the id and stored nowhere, so they are matched
 * here rather than in SQL.
 */
export async function findSightingNameMatches({
	conferenceId,
	search
}: {
	conferenceId: string;
	search: string;
}) {
	const term = search.trim().toLowerCase();
	if (!term) return [];
	const result = await db.execute<{ id: string }>(applicationIdsSql(conferenceId));
	const matches: { id: string }[] = [];
	for (const { id } of result.rows) {
		if (`${codenmz(id)} ${id}`.toLowerCase().includes(term)) matches.push({ id });
		if (matches.length >= MAX_NAME_MATCHES) break;
	}
	return matches;
}

/**
 * The schools of the people in the conference's applications whose name contains the search
 * (every school without one), 20 when no limit is given.
 */
export async function searchSightingSchools({
	conferenceId,
	search,
	limit
}: {
	conferenceId: string;
	search?: string | null;
	limit?: number | null;
}) {
	const escaped = (search ?? '').trim().replace(/[\\%_]/g, '\\$&');
	const result = await db.execute<Record<string, unknown>>(
		schoolsSql({ conferenceId, like: `%${escaped}%`, limit: limit ?? 20 })
	);
	return z.array(schoolRowSchema).parse(result.rows);
}
