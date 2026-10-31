import { db, schema, type Transaction } from '#api/db/db';
import {
	conferenceParticipantPubsub,
	conferenceSupervisorPubsub,
	delegationMemberPubsub,
	delegationPubsub,
	schoolPubsub,
	schoolSuggestionPubsub,
	schoolSuggestionVariantPubsub,
	singleParticipantPubsub,
	waitingListEntryPubsub
} from '#api/pubsub';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { sql } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import { z } from 'zod';

/**
 * The school a person names for themselves (when applying, as a supervisor, on the waiting list or
 * changing it later): an existing
 * school (`schoolId`), the name of one to find or create (`schoolName`), or neither. Leaving both
 * out of an update keeps the school; passing both as null removes it.
 */
export type SchoolChoice = { schoolId?: string | null; schoolName?: string | null };

/** `text` for an `ilike` pattern, its wildcards escaped. */
function escapeLike(text: string) {
	return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** A typed school name as it is stored: trimmed, with runs of whitespace collapsed. */
function cleanSchoolName(name: string) {
	return name.replace(/\s+/g, ' ').trim();
}

type Db = Transaction | typeof db;

async function existingSchool({ id, tx }: { id: string; tx: Db }) {
	const existing = await tx.query.school.findFirst({ where: { id }, columns: { id: true } });
	if (!existing) throw apiError({ code: 'NOT_FOUND', message: m.schoolNotFound() });
	return existing.id;
}

/** The school of that name (ignoring case and spacing), created when there is none. */
async function schoolNamed({ typed, tx }: { typed: string; tx: Db }) {
	const name = cleanSchoolName(typed);
	if (!name) return null;
	const [existing] = await tx
		.select({ id: schema.school.id })
		.from(schema.school)
		.where(sql`lower(${schema.school.name}) = lower(${name})`)
		.orderBy(schema.school.createdAt)
		.limit(1);
	if (existing) return existing.id;
	const [created] = await tx.insert(schema.school).values({ name }).returning();
	if (created) schoolPubsub.created();
	return created?.id ?? null;
}

/**
 * The school a choice names: the given one, an existing school of that name (ignoring case and
 * spacing), or a new one. `null` for no school, `undefined` when the choice leaves it unchanged.
 */
export async function resolveSchoolChoice({
	choice,
	tx = db
}: {
	choice: SchoolChoice;
	tx?: Db;
}): Promise<string | null | undefined> {
	if (choice.schoolId) return existingSchool({ id: choice.schoolId, tx });
	if (typeof choice.schoolName === 'string') return schoolNamed({ typed: choice.schoolName, tx });
	// both left out keeps the school; either one null removes it
	return choice.schoolId === null || choice.schoolName === null ? null : undefined;
}

type SchoolInsert = typeof schema.school.$inferInsert;
type EditableSchoolField =
	| 'name'
	| 'street'
	| 'apartment'
	| 'zip'
	| 'city'
	| 'region'
	| 'country'
	| 'website'
	| 'contactName'
	| 'contactEmail'
	| 'contactPhone'
	| 'notes';

/** The fields of a school the team edits; an omitted field stays, `null` clears it (not the name). */
export type SchoolUpdate = { [K in EditableSchoolField]?: SchoolInsert[K] | null };

export async function updateSchool({ id, update }: { id: string; update: SchoolUpdate }) {
	const name =
		update.name === undefined || update.name === null ? undefined : cleanSchoolName(update.name);
	if (name === '') throw apiError({ code: 'INVALID_INPUT', message: m.schoolNameRequired() });
	await db
		.update(schema.school)
		.set({ ...update, name })
		.where(whereRows({ table: schema.school, filter: { id } }));
	schoolPubsub.updated(id);
}

/**
 * Folds `sourceIds` into `targetId`: everything naming a source names the target afterwards, the
 * target takes over details it has none of and the notes of all of them, and the sources are
 * deleted. Merging is how duplicates typed by applicants are cleaned up.
 */
export async function mergeSchools({
	targetId,
	sourceIds,
	name
}: {
	targetId: string;
	sourceIds: readonly string[];
	name?: string;
}) {
	const sources = [...new Set(sourceIds)].filter((id) => id !== targetId);
	if (sources.length === 0) return;

	const repointed = await db.transaction(async (tx) => {
		const rows = await tx.query.school.findMany({ where: { id: { in: [targetId, ...sources] } } });
		const target = rows.find((row) => row.id === targetId);
		if (!target) throw apiError({ code: 'NOT_FOUND', message: m.schoolNotFound() });
		const merged = rows.filter((row) => row.id !== targetId);

		const fill = <K extends keyof typeof target>(key: K) =>
			target[key] ?? merged.find((row) => row[key] !== null)?.[key] ?? null;
		const notes = [target.notes, ...merged.map((row) => row.notes)]
			.filter((note): note is string => !!note?.trim())
			.join('\n\n');

		const [waitingListEntries, participants] = await Promise.all(
			[schema.waitingListEntry, schema.conferenceParticipant].map((table) =>
				tx
					.update(table)
					.set({ schoolId: targetId })
					.where(whereRows({ table, filter: { schoolId: { in: sources } } }))
					.returning({ id: table.id })
			)
		);
		const participantIds = participants.map((row) => row.id);
		// registrations read their school through the participant row
		const registrationWhere = { conferenceParticipantId: { in: participantIds } };
		const [members, singleParticipants, supervisors] = participantIds.length
			? await Promise.all([
					tx.query.delegationMember.findMany({
						where: registrationWhere,
						columns: { id: true, delegationId: true }
					}),
					tx.query.singleParticipant.findMany({
						where: registrationWhere,
						columns: { id: true }
					}),
					tx.query.conferenceSupervisor.findMany({
						where: registrationWhere,
						columns: { id: true }
					})
				])
			: [[], [], []];

		await tx
			.update(schema.school)
			.set({
				name: name ? cleanSchoolName(name) : target.name,
				street: fill('street'),
				apartment: fill('apartment'),
				zip: fill('zip'),
				city: fill('city'),
				region: fill('region'),
				country: fill('country'),
				website: fill('website'),
				contactName: fill('contactName'),
				contactEmail: fill('contactEmail'),
				contactPhone: fill('contactPhone'),
				notes: notes || null
			})
			.where(whereRows({ table: schema.school, filter: { id: targetId } }));

		// The sources' variants cascade with them; a suggestion left with the target alone has
		// nothing to suggest any more.
		await tx
			.delete(schema.school)
			.where(whereRows({ table: schema.school, filter: { id: { in: sources } } }));
		await tx.execute(sql`
			delete from school_suggestion s
			where s.id in (select suggestion_id from school_suggestion_variant where school_id = ${targetId})
				and (select count(*) from school_suggestion_variant v where v.suggestion_id = s.id) < 2
		`);

		return {
			waitingListEntryIds: waitingListEntries.map((row) => row.id),
			participantIds,
			memberIds: members.map((row) => row.id),
			delegationIds: [...new Set(members.map((row) => row.delegationId))],
			singleParticipantIds: singleParticipants.map((row) => row.id),
			supervisorIds: supervisors.map((row) => row.id)
		};
	});
	schoolPubsub.updated(targetId);
	schoolPubsub.removed();
	// the sources' variants cascaded, and suggestions left with one school may be gone
	schoolSuggestionPubsub.removed();
	schoolSuggestionVariantPubsub.removed();
	const announce: [{ updated: (ids: string[]) => void }, string[]][] = [
		[waitingListEntryPubsub, repointed.waitingListEntryIds],
		[conferenceParticipantPubsub, repointed.participantIds],
		[delegationMemberPubsub, repointed.memberIds],
		[delegationPubsub, repointed.delegationIds],
		[singleParticipantPubsub, repointed.singleParticipantIds],
		[conferenceSupervisorPubsub, repointed.supervisorIds]
	];
	for (const [pubsub, ids] of announce) if (ids.length > 0) pubsub.updated(ids);
}

/**
 * Ids of schools matching `search`, best first: names starting with it, then names containing a
 * word starting with it, then by trigram similarity, the most used schools first among equals.
 */
export async function searchSchoolIds({ search, limit }: { search: string; limit: number }) {
	const term = cleanSchoolName(search);
	if (!term) return [];
	const escaped = escapeLike(term);
	const result = await db.execute<{ id: string }>(sql`
		select s.id
		from school s
		where s.name ilike ${`%${escaped}%`} or s.name % ${term} or s.city ilike ${`%${escaped}%`}
		order by
			(s.name ilike ${`${escaped}%`}) desc,
			(s.name ilike ${`% ${escaped}%`}) desc,
			similarity(s.name, ${term}) desc,
			(select count(*) from conference_participant p where p.school_id = s.id) desc,
			s.name
		limit ${limit}`);
	return result.rows.map((row) => row.id);
}

const schoolMetricsRowSchema = z.object({
	conferenceId: z.string(),
	conferenceTitle: z.string(),
	startConference: z.coerce.date(),
	delegations: z.number(),
	participants: z.number(),
	applied: z.number(),
	seated: z.number(),
	attended: z.number(),
	supervisors: z.number(),
	waitingList: z.number(),
	fromWaitingList: z.number()
});

/**
 * Per conference, how many people from the school registered, applied, got a seat and came: in
 * `conferenceIds`, or in every conference when that is `undefined`.
 */
export async function schoolMetrics({
	schoolId,
	conferenceIds
}: {
	schoolId: string;
	conferenceIds: readonly string[] | undefined;
}) {
	if (conferenceIds?.length === 0) return [];
	const result = await db.execute<{ result: unknown }>(sql`
		-- each person by their own school, whatever delegation the assignment put them in
		with people as (
			select p.conference_id, dm.delegation_id, p.id as participant_id,
				d.applied, d.assigned_role_id is not null as seated, false as supervisor
			from conference_participant p
			join delegation_member dm on dm.conference_participant_id = p.id
			join delegation d on d.id = dm.delegation_id
			where p.school_id = ${schoolId}
			union all
			select p.conference_id, null, p.id, sp.applied, sp.assigned_role_id is not null, false
			from conference_participant p join single_participant sp on sp.conference_participant_id = p.id
			where p.school_id = ${schoolId}
			union all
			select p.conference_id, null, p.id, true, false, true
			from conference_participant p join conference_supervisor cs on cs.conference_participant_id = p.id
			where p.school_id = ${schoolId}
		),
		waiting as (
			select conference_id, count(*)::int as entries, count(*) filter (where assigned_at is not null)::int as assigned
			from waiting_list_entry where school_id = ${schoolId} group by conference_id
		),
		conferences as (
			select conference_id from people union select conference_id from waiting
		)
		select json_build_object(
			'conferenceId', c.id,
			'conferenceTitle', c.title,
			'startConference', c.start_conference,
			'delegations', (select count(distinct p.delegation_id) from people p where p.conference_id = c.id),
			'participants', (select count(*) from people p where p.conference_id = c.id and not p.supervisor),
			'applied', (select count(*) from people p where p.conference_id = c.id and not p.supervisor and p.applied),
			'seated', (select count(*) from people p where p.conference_id = c.id and p.seated),
			'attended', (select count(*) from people p join conference_participant cp on cp.id = p.participant_id
				where p.conference_id = c.id and not p.supervisor and cp.did_attend),
			'supervisors', (select count(*) from people p where p.conference_id = c.id and p.supervisor),
			'waitingList', coalesce(w.entries, 0),
			'fromWaitingList', coalesce(w.assigned, 0)
		) as result
		from conferences x
		join conference c on c.id = x.conference_id
		left join waiting w on w.conference_id = c.id
		${
			conferenceIds
				? sql`where c.id in (${sql.join(
						conferenceIds.map((id) => sql`${id}`),
						sql`, `
					)})`
				: sql``
		}
		order by c.start_conference desc`);
	return z
		.array(z.object({ result: schoolMetricsRowSchema }))
		.parse(result.rows)
		.map((row) => row.result);
}

export const CONFERENCE_SCHOOL_SORT_COLUMNS = [
	'name',
	'city',
	'delegations',
	'participants',
	'applied',
	'seated',
	'supervisors',
	'waitingList'
] as const;
export type ConferenceSchoolSortColumn = (typeof CONFERENCE_SCHOOL_SORT_COLUMNS)[number];

const conferenceSchoolRowSchema = z.object({
	schoolId: z.string(),
	name: z.string(),
	city: z.string().nullable(),
	delegations: z.number(),
	participants: z.number(),
	applied: z.number(),
	seated: z.number(),
	supervisors: z.number(),
	waitingList: z.number()
});

/**
 * The schools of the people in one conference - participants, supervisors and those on the
 * waiting list - with how many people each sends, one page at a time.
 */
export async function conferenceSchoolsPage(args: {
	conferenceId: string;
	search?: string | null;
	sortColumn: ConferenceSchoolSortColumn;
	sortDesc: boolean;
	limit: number;
	offset: number;
}) {
	const term = args.search ? cleanSchoolName(args.search) : '';
	const like = `%${escapeLike(term)}%`;
	const direction = args.sortDesc ? sql`desc` : sql`asc`;
	const orderColumn = sql.identifier(
		args.sortColumn === 'waitingList' ? 'waiting_list' : args.sortColumn
	);

	const result = await db.execute<{ result: unknown; total: unknown }>(sql`
		-- each person by their own school, whatever delegation the assignment put them in
		with people as (
			select cp.school_id, d.id as delegation_id, d.applied, d.assigned_role_id is not null as seated,
				'MEMBER' as kind
			from conference_participant cp
			join delegation_member dm on dm.conference_participant_id = cp.id
			join delegation d on d.id = dm.delegation_id
			where cp.conference_id = ${args.conferenceId} and cp.school_id is not null
			union all
			select cp.school_id, null, sp.applied, sp.assigned_role_id is not null, 'SINGLE'
			from single_participant sp join conference_participant cp on cp.id = sp.conference_participant_id
			where cp.conference_id = ${args.conferenceId} and cp.school_id is not null
			union all
			select cp.school_id, null, true, false, 'SUPERVISOR'
			from conference_supervisor cs join conference_participant cp on cp.id = cs.conference_participant_id
			where cp.conference_id = ${args.conferenceId} and cp.school_id is not null
			union all
			select w.school_id, null, false, false, 'WAITING'
			from waiting_list_entry w
			where w.conference_id = ${args.conferenceId} and w.school_id is not null and w.assigned_at is null
		),
		rows as (
			select s.id as school_id, s.name, s.city,
				count(distinct p.delegation_id)::int as delegations,
				count(*) filter (where p.kind in ('MEMBER', 'SINGLE'))::int as participants,
				count(*) filter (where p.kind in ('MEMBER', 'SINGLE') and p.applied)::int as applied,
				count(*) filter (where p.seated)::int as seated,
				count(*) filter (where p.kind = 'SUPERVISOR')::int as supervisors,
				count(*) filter (where p.kind = 'WAITING')::int as waiting_list
			from people p join school s on s.id = p.school_id
			where ${term ? sql`(s.name ilike ${like} or s.city ilike ${like})` : sql`true`}
			group by s.id
		)
		select json_build_object(
			'schoolId', school_id, 'name', name, 'city', city, 'delegations', delegations,
			'participants', participants, 'applied', applied, 'seated', seated,
			'supervisors', supervisors, 'waitingList', waiting_list
		) as result, count(*) over ()::int as total
		from rows
		order by ${orderColumn} ${direction} nulls last, name, school_id
		limit ${args.limit + 1} offset ${args.offset}`);

	const rows = z
		.array(z.object({ result: conferenceSchoolRowSchema, total: z.number() }))
		.parse(result.rows);
	return {
		rows: rows.slice(0, args.limit).map((row) => row.result),
		hasMore: rows.length > args.limit,
		total:
			rows[0]?.total ??
			(args.offset > 0
				? await countConferenceSchools({ conferenceId: args.conferenceId, term })
				: 0)
	};
}

/** How many schools a page past the end would have listed, for its total. */
async function countConferenceSchools({
	conferenceId,
	term
}: {
	conferenceId: string;
	term: string;
}) {
	const page = await conferenceSchoolsPage({
		conferenceId,
		search: term,
		sortColumn: 'name',
		sortDesc: false,
		limit: 1,
		offset: 0
	});
	return page.total;
}
