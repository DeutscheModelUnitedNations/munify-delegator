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
import { cleanSchoolName } from './schoolArgs';

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
export type SchoolUpdate = { [K in EditableSchoolField]?: SchoolInsert[K] | null } & {
	isForeignSchool?: boolean;
};

/**
 * Changes the given fields of a school the caller may update (`assertCanUpdateSchools`); an
 * omitted field stays, `null` clears it (not the name, `schoolRenameSchema`).
 */
export async function updateSchool({ id, update }: { id: string; update: SchoolUpdate }) {
	const name =
		update.name === undefined || update.name === null ? undefined : cleanSchoolName(update.name);
	await db
		.update(schema.school)
		.set({ ...update, name, updatedAt: new Date() })
		.where(whereRows({ table: schema.school, filter: { id } }));
	schoolPubsub.updated(id);
}

/**
 * Folds `sourceIds` into `targetId`, all of which the caller may update (`assertCanUpdateSchools`):
 * everything naming a source names the target afterwards, across every conference, the target
 * takes over details it has none of and the notes of all of them, and the sources are deleted.
 * Merging is how duplicates typed by applicants are cleaned up.
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
		const registrations = await registrationsOf({ tx, participantIds });

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
				// one of them known to be abroad is enough
				isForeignSchool: rows.some((row) => row.isForeignSchool),
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
			...registrations
		};
	});
	schoolPubsub.updated(targetId);
	schoolPubsub.removed();
	// the sources' variants cascaded, and suggestions left with one school may be gone
	schoolSuggestionPubsub.removed();
	schoolSuggestionVariantPubsub.removed();
	announceSchoolChanged(repointed);
}

/** The registrations that read their school through these participant rows. */
async function registrationsOf({ tx, participantIds }: { tx: Db; participantIds: string[] }) {
	if (participantIds.length === 0) {
		return { memberIds: [], delegationIds: [], singleParticipantIds: [], supervisorIds: [] };
	}
	const where = { conferenceParticipantId: { in: participantIds } };
	const [members, singleParticipants, supervisors] = await Promise.all([
		tx.query.delegationMember.findMany({ where, columns: { id: true, delegationId: true } }),
		tx.query.singleParticipant.findMany({ where, columns: { id: true } }),
		tx.query.conferenceSupervisor.findMany({ where, columns: { id: true } })
	]);
	return {
		memberIds: members.map((row) => row.id),
		delegationIds: [...new Set(members.map((row) => row.delegationId))],
		singleParticipantIds: singleParticipants.map((row) => row.id),
		supervisorIds: supervisors.map((row) => row.id)
	};
}

/** Announces the rows whose school changed, and the registrations reading it through them. */
function announceSchoolChanged(
	changed: { waitingListEntryIds: string[]; participantIds: string[] } & Awaited<
		ReturnType<typeof registrationsOf>
	>
) {
	const announce: [{ updated: (ids: string[]) => void }, string[]][] = [
		[waitingListEntryPubsub, changed.waitingListEntryIds],
		[conferenceParticipantPubsub, changed.participantIds],
		[delegationMemberPubsub, changed.memberIds],
		[delegationPubsub, changed.delegationIds],
		[singleParticipantPubsub, changed.singleParticipantIds],
		[conferenceSupervisorPubsub, changed.supervisorIds]
	];
	for (const [pubsub, ids] of announce) if (ids.length > 0) pubsub.updated(ids);
}

/**
 * Deletes a school the caller may delete (the `delete` ability), for a name typed wrongly: the
 * people and waiting list entries naming it are left without a school, and suggestions left with
 * a single school go too.
 */
export async function deleteSchool(id: string) {
	const cleared = await db.transaction(async (tx) => {
		const [waitingListEntries, participants] = await Promise.all([
			tx.query.waitingListEntry.findMany({ where: { schoolId: id }, columns: { id: true } }),
			tx.query.conferenceParticipant.findMany({ where: { schoolId: id }, columns: { id: true } })
		]);
		const suggestionIds = (
			await tx.query.schoolSuggestionVariant.findMany({
				where: { schoolId: id },
				columns: { suggestionId: true }
			})
		).map((row) => row.suggestionId);
		// references set null, the school's variants cascade
		await tx.delete(schema.school).where(whereRows({ table: schema.school, filter: { id } }));
		if (suggestionIds.length > 0) {
			await tx.execute(sql`
				delete from school_suggestion s
				where s.id in (${sql.join(
					suggestionIds.map((suggestionId) => sql`${suggestionId}`),
					sql`, `
				)})
					and (select count(*) from school_suggestion_variant v where v.suggestion_id = s.id) < 2
			`);
		}
		const participantIds = participants.map((row) => row.id);
		return {
			waitingListEntryIds: waitingListEntries.map((row) => row.id),
			participantIds,
			...(await registrationsOf({ tx, participantIds }))
		};
	});
	schoolPubsub.removed();
	schoolSuggestionPubsub.removed();
	schoolSuggestionVariantPubsub.removed();
	announceSchoolChanged(cleared);
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
