import { sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';

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

/** The `status` argument: one of the filters, all when left out. */
export const sightingStatusSchema = z
	.enum(SIGHTING_STATUS_FILTERS, { error: () => m.sightingStatusUnknown() })
	.nullish()
	.transform((status) => status ?? 'all');

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
 * The schools of an application's people (`p` their `conference_participant`), each once, with ''
 * for anyone without one: a delegation keeps no school of its own. `names` lists their names,
 * `ids` their ids, which is what the school filter matches.
 */
const schoolsOfPeople = ({ from, where, of }: { from: SQL; where: SQL; of: 'names' | 'ids' }) =>
	sql`coalesce((select array_agg(distinct coalesce(${of === 'names' ? sql`sc.name` : sql`sc.id`}, '')) ${from}
		left join school sc on sc.id = p.school_id where ${where}), '{}')`;

/**
 * Every application under review - applied delegations, then single participants (whose conference
 * is their `conference_participant`'s) - with its size, its people's schools (`schools`, and as
 * one line `school`), its review and how far the sighting has come with it (`status`). The one
 * place that says what the sighting's deck is; everything else filters and orders this.
 */
function applications(conferenceId: string): SQL {
	return sql`
		select *, nullif(array_to_string(array_remove(schools, ''), ', '), '') as school
		from (${applicationRows(conferenceId)}) rows`;
}

const delegationPeople = {
	from: sql`from delegation_member dm join conference_participant p on p.id = dm.conference_participant_id`,
	where: sql`dm.delegation_id = d.id`
};
const singlePerson = {
	from: sql`from conference_participant p`,
	where: sql`p.id = s.conference_participant_id`
};

function applicationRows(conferenceId: string): SQL {
	return sql`
		select d.id, 'delegation'::text as kind, 0 as kind_rank,
			${schoolsOfPeople({ ...delegationPeople, of: 'names' })} as schools,
			${schoolsOfPeople({ ...delegationPeople, of: 'ids' })} as school_ids,
			d.member_count as size,
			r.evaluation, coalesce(r.flagged, false) as flagged,
			coalesce(r.disqualified, false) as disqualified, coalesce(r.required, false) as required, r.note,
			case when coalesce(r.disqualified, false) then 'disqualified'
				when r.evaluation is not null then 'rated'
				when coalesce(r.flagged, false) then 'flagged'
				else 'unrated' end as status
		from delegation d
		left join assignment_review r on r.delegation_id = d.id
		where d.conference_id = ${conferenceId} and d.applied
		union all
		select s.id, 'single'::text, 1,
			${schoolsOfPeople({ ...singlePerson, of: 'names' })},
			${schoolsOfPeople({ ...singlePerson, of: 'ids' })},
			1,
			r.evaluation, coalesce(r.flagged, false), coalesce(r.disqualified, false),
			coalesce(r.required, false), r.note,
			case when coalesce(r.disqualified, false) then 'disqualified'
				when r.evaluation is not null then 'rated'
				when coalesce(r.flagged, false) then 'flagged'
				else 'unrated' end
		from single_participant s
		join conference_participant p on p.id = s.conference_participant_id
		left join assignment_review r on r.single_participant_id = s.id
		where p.conference_id = ${conferenceId} and s.applied`;
}

/** The deck's order: delegations before singles, the largest first, ties by id. */
const deckOrder = sql`a.kind_rank, a.size desc, a.id`;

/**
 * The `schoolId` / `withoutSchool` arguments: applications with someone from that school, or with
 * someone without one; every application when both are left out.
 */
export const schoolFilterSchema = z
	.object({ schoolId: z.string().nullish(), withoutSchool: z.boolean().nullish() })
	.refine((args) => !(args.schoolId && args.withoutSchool), {
		error: () => m.sightingSchoolFilterConflict()
	});

/** Which applications the school filter lets through: with a person of that school id, `''` for none. */
export type SchoolFilter = string | null;

export function schoolFilterOf(args: {
	schoolId?: string | null;
	withoutSchool?: boolean | null;
}): SchoolFilter {
	if (args.withoutSchool) return '';
	return args.schoolId ?? null;
}

function passes({ status, school }: { status: SightingStatusFilter; school: SchoolFilter }): SQL {
	return school === null
		? statusPredicates[status]
		: sql`${statusPredicates[status]} and ${school} = any(a.school_ids)`;
}

const entrySchema = z.object({
	kind: z.enum(['delegation', 'single']),
	id: z.string(),
	school: z.string().nullable(),
	size: z.number(),
	status: z.enum(['disqualified', 'flagged', 'rated', 'unrated']),
	required: z.boolean()
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
	unreviewedPastWindow: entrySchema.nullable()
});

/**
 * The window of the filtered deck around the card on top, with where that card is and the counts
 * the progress bar sums up. The browser turns the cards within the window by itself, so all it
 * needs from beyond it is where "next unreviewed" goes once the window has none left
 * (`unreviewedPastWindow`: the first unrated card after the window, or else the deck's first).
 *
 * `index` (a slider seek) wins over `currentId`. A card the filters hide - rated while the deck
 * shows the unrated ones - leaves the card that took its place on top, not the first one.
 */
export function deckSql(options: {
	conferenceId: string;
	status: SightingStatusFilter;
	school: SchoolFilter;
	currentId: string | null;
	index: number | null;
	size: number;
}): SQL {
	const { conferenceId, status, school, currentId, index, size } = options;
	const entry = (alias: string) =>
		sql.raw(
			`json_build_object('kind', ${alias}.kind, 'id', ${alias}.id, 'school', ${alias}.school, 'size', ${alias}.size, 'status', ${alias}.status, 'required', ${alias}.required)`
		);
	// Only what the deck is sorted and shown by goes through the sort: the reviews' notes would
	// make every row it moves wider for nothing.
	return sql`
		with apps as (select * from (${applications(conferenceId)}) a),
		deck as (
			select a.id, a.kind, a.kind_rank, a.school, a.size, a.status, a.required,
				row_number() over (order by ${deckOrder}) - 1 as idx
			from apps a where ${passes({ status, school })}
		),
		totals as (select count(*)::int as n from deck),
		cur as (
			select coalesce(
				case when ${index}::int is not null
					then least(greatest(${index}::int, 0), greatest((select n from totals) - 1, 0)) end,
				(select idx from deck where id = ${currentId}::text),
				(select least(count(*), greatest((select n from totals) - 1, 0)) from deck d
					where (d.kind_rank, -d.size, d.id) <
						(select a.kind_rank, -a.size, a.id from apps a where a.id = ${currentId}::text limit 1)),
				0
			)::int as i
		),
		win as (
			select greatest(0, least((select i from cur) - ${Math.floor(size / 2)},
				(select n from totals) - ${size}))::int as s
		),
		beyond as (
			select coalesce(
				(select min(idx) from deck where status = 'unrated' and idx >= (select s from win) + ${size}),
				(select min(idx) from deck where status = 'unrated')
			) as i
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
			'unreviewedPastWindow', (select ${entry('d')} from deck d where d.idx = (select i from beyond))
		) as result`;
}

/** The deck entries among `ids` that pass the filters, in deck order. */
export function entriesSql({
	conferenceId,
	ids,
	status,
	school
}: {
	conferenceId: string;
	ids: readonly string[];
	status: SightingStatusFilter;
	school: SchoolFilter;
}): SQL {
	return sql`
		select json_build_object('kind', a.kind, 'id', a.id, 'school', a.school, 'size', a.size,
			'status', a.status, 'required', a.required) as result
		from (${applications(conferenceId)}) a
		where a.id in (${sql.join(
			ids.map((id) => sql`${id}`),
			sql`, `
		)}) and ${passes({ status, school })}
		order by ${deckOrder}`;
}

export const schoolRowSchema = z.object({
	schoolId: z.string().nullable(),
	school: z.string(),
	city: z.string().nullable(),
	applications: z.number(),
	people: z.number()
});

/**
 * The schools of the people in the conference's applications matching `search` (no id and ''
 * for those without one), with how many applications they are in and how many people they send.
 */
export function schoolsSql({
	conferenceId,
	like,
	limit
}: {
	conferenceId: string;
	like: string;
	limit: number;
}): SQL {
	return sql`
		with people as (
			select dm.delegation_id as application_id, sc.id as school_id,
				coalesce(sc.name, '') as school, sc.city
			from delegation_member dm
			join delegation d on d.id = dm.delegation_id
			join conference_participant p on p.id = dm.conference_participant_id
			left join school sc on sc.id = p.school_id
			where d.conference_id = ${conferenceId} and d.applied
			union all
			select s.id, sc.id, coalesce(sc.name, ''), sc.city
			from single_participant s
			join conference_participant p on p.id = s.conference_participant_id
			left join school sc on sc.id = p.school_id
			where p.conference_id = ${conferenceId} and s.applied
		)
		select school_id as "schoolId", school, city,
			count(distinct application_id)::int as applications, count(*)::int as people
		from people
		where school ilike ${like}
		group by school_id, school, city
		order by school, city nulls first, school_id
		limit ${limit}`;
}

/** Ids of every application under review, for matching their codenames. */
export function applicationIdsSql(conferenceId: string): SQL {
	return sql`
		select id from delegation where conference_id = ${conferenceId} and applied
		union all
		select s.id from single_participant s
		join conference_participant p on p.id = s.conference_participant_id
		where p.conference_id = ${conferenceId} and s.applied`;
}
