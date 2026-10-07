import { sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';

/** The statuses the sighting filters by; `all` lets everything through. */
const SIGHTING_STATUS_FILTERS = [
	'all',
	'unrated',
	'rated',
	'flagged',
	'disqualified',
	'noted'
] as const;
export type SightingStatusFilter = (typeof SIGHTING_STATUS_FILTERS)[number];

export function isSightingStatusFilter(value: string): value is SightingStatusFilter {
	return SIGHTING_STATUS_FILTERS.some((status) => status === value);
}

/** Mirrors the browser's old filter: a flagged application that is not rated counts as unrated. */
const statusPredicates: Record<SightingStatusFilter, SQL> = {
	all: sql`true`,
	unrated: sql`(a.evaluation is null and not a.disqualified)`,
	rated: sql`(a.evaluation is not null)`,
	flagged: sql`a.flagged`,
	disqualified: sql`a.disqualified`,
	noted: sql`(coalesce(a.note, '') <> '')`
};

/**
 * Every application under review - applied delegations, then single participants - with its size,
 * its review and how far the sighting has come with it (`status`). The one place that says what
 * the sighting's deck is; everything else filters and orders this.
 */
function applications(conferenceId: string): SQL {
	return sql`
		select d.id, 'delegation'::text as kind, 0 as kind_rank, d.school,
			coalesce(m.n, 0)::int as size,
			r.evaluation, coalesce(r.flagged, false) as flagged,
			coalesce(r.disqualified, false) as disqualified, r.note,
			case when coalesce(r.disqualified, false) then 'disqualified'
				when r.evaluation is not null then 'rated'
				when coalesce(r.flagged, false) then 'flagged'
				else 'unrated' end as status
		from delegation d
		left join (
			select delegation_id, count(*) as n from delegation_member
			where conference_id = ${conferenceId} group by delegation_id
		) m on m.delegation_id = d.id
		left join assignment_review r on r.delegation_id = d.id
		where d.conference_id = ${conferenceId} and d.applied
		union all
		select s.id, 'single'::text, 1, s.school, 1,
			r.evaluation, coalesce(r.flagged, false), coalesce(r.disqualified, false), r.note,
			case when coalesce(r.disqualified, false) then 'disqualified'
				when r.evaluation is not null then 'rated'
				when coalesce(r.flagged, false) then 'flagged'
				else 'unrated' end
		from single_participant s
		left join assignment_review r on r.single_participant_id = s.id
		where s.conference_id = ${conferenceId} and s.applied`;
}

/** The deck's order: delegations before singles, the largest first, ties by id. */
const deckOrder = sql`a.kind_rank, a.size desc, a.id`;

function passes(status: SightingStatusFilter, school: string | null | undefined): SQL {
	return school === null || school === undefined
		? statusPredicates[status]
		: sql`${statusPredicates[status]} and coalesce(a.school, '') = ${school}`;
}

const entrySchema = z.object({
	kind: z.enum(['delegation', 'single']),
	id: z.string(),
	school: z.string().nullable(),
	size: z.number(),
	status: z.enum(['disqualified', 'flagged', 'rated', 'unrated'])
});

export const deckSchema = z.object({
	total: z.number(),
	counts: z.object({
		rated: z.number(),
		flagged: z.number(),
		disqualified: z.number(),
		unrated: z.number()
	}),
	overallRated: z.number(),
	overallTotal: z.number(),
	index: z.number(),
	start: z.number(),
	entries: z.array(entrySchema),
	current: entrySchema.nullable(),
	previous: entrySchema.nullable(),
	next: entrySchema.nullable(),
	nextUnreviewed: entrySchema.nullable()
});

/**
 * The window of the filtered deck around the card on top, with where that card is, the counts the
 * progress bar sums up, and the cards one step either way and the next one nobody looked at.
 * `index` (a slider seek) wins over `currentId`; a card the filters hide falls back to the first.
 */
export function deckSql(options: {
	conferenceId: string;
	status: SightingStatusFilter;
	school: string | null;
	currentId: string | null;
	index: number | null;
	size: number;
}): SQL {
	const { conferenceId, status, school, currentId, index, size } = options;
	const entry = (alias: string) =>
		sql.raw(
			`json_build_object('kind', ${alias}.kind, 'id', ${alias}.id, 'school', ${alias}.school, 'size', ${alias}.size, 'status', ${alias}.status)`
		);
	return sql`
		with apps as (select * from (${applications(conferenceId)}) a),
		deck as (
			select a.*, row_number() over (order by ${deckOrder}) - 1 as idx
			from apps a where ${passes(status, school)}
		),
		totals as (select count(*)::int as n from deck),
		cur as (
			select coalesce(
				case when ${index}::int is not null
					then least(greatest(${index}::int, 0), greatest((select n from totals) - 1, 0)) end,
				(select idx from deck where id = ${currentId}::text),
				0
			)::int as i
		),
		win as (
			select greatest(0, least((select i from cur) - ${Math.floor(size / 2)},
				(select n from totals) - ${size}))::int as s
		)
		select json_build_object(
			'total', (select n from totals),
			'counts', (select json_build_object(
				'rated', count(*) filter (where status = 'rated'),
				'flagged', count(*) filter (where status = 'flagged'),
				'disqualified', count(*) filter (where status = 'disqualified'),
				'unrated', count(*) filter (where status = 'unrated')) from deck),
			'overallRated', (select count(*) filter (where evaluation is not null or disqualified) from apps),
			'overallTotal', (select count(*) from apps),
			'index', (select i from cur),
			'start', (select s from win),
			'entries', coalesce((select json_agg(${entry('d')} order by d.idx) from deck d
				where d.idx >= (select s from win) and d.idx < (select s from win) + ${size}), '[]'::json),
			'current', (select ${entry('d')} from deck d where d.idx = (select i from cur)),
			'previous', (select ${entry('d')} from deck d where d.idx = (select i from cur) - 1),
			'next', (select ${entry('d')} from deck d where d.idx = (select i from cur) + 1),
			'nextUnreviewed', coalesce(
				(select ${entry('d')} from deck d where d.status = 'unrated' and d.idx > (select i from cur)
					order by d.idx limit 1),
				(select ${entry('d')} from deck d where d.status = 'unrated' and d.idx <> (select i from cur)
					order by d.idx limit 1))
		) as result`;
}

/** The deck entries among `ids` that pass the filters, in deck order. */
export function entriesSql(
	conferenceId: string,
	ids: readonly string[],
	status: SightingStatusFilter,
	school: string | null
): SQL {
	return sql`
		select json_build_object('kind', a.kind, 'id', a.id, 'school', a.school, 'size', a.size,
			'status', a.status) as result
		from (${applications(conferenceId)}) a
		where a.id in (${sql.join(
			ids.map((id) => sql`${id}`),
			sql`, `
		)}) and ${passes(status, school)}
		order by ${deckOrder}`;
}

export const schoolRowSchema = z.object({
	school: z.string(),
	applications: z.number(),
	people: z.number()
});

/** The schools of the conference's applications matching `search`, with their applications and people. */
export function schoolsSql(conferenceId: string, like: string, limit: number): SQL {
	return sql`
		select coalesce(a.school, '') as school, count(*)::int as applications, sum(a.size)::int as people
		from (${applications(conferenceId)}) a
		where coalesce(a.school, '') ilike ${like}
		group by coalesce(a.school, '')
		order by 1
		limit ${limit}`;
}

/** Ids of every application under review, for matching their codenames. */
export function applicationIdsSql(conferenceId: string): SQL {
	return sql`
		select id from delegation where conference_id = ${conferenceId} and applied
		union all
		select id from single_participant where conference_id = ${conferenceId} and applied`;
}
