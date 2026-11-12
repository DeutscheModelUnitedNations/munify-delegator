import { sql, type SQL } from 'drizzle-orm';
import type { schema } from '#api/db/db';
import { birthdayBoundsForAge } from '#lib/helpers/ageChecker';
import {
	APPLICATION_REMINDER_DAYS,
	CHASE_INTRO_REMINDER_DAYS,
	OPEN_ISSUES_REMINDER_DAYS,
	PHONE_READY_REMINDER_DAYS,
	SURVEY_REMINDER_DAYS
} from '#lib/helpers/emailKinds';
import { inWindowBefore, type AutomaticEmailKind, type EmailSnapshot } from './dueEmails';

/**
 * Which rows may be owed a mail, in SQL, so the sweep reads only those (`emailSnapshot.ts`) rather
 * than everybody who got all their mails long ago. Each kind has a predicate on the participant
 * row that holds for everyone its rule in `dueEmails` may owe a mail and has no closed log row for:
 * a superset, never a subset. It may let through someone owed nothing, which costs a little
 * reading; it must never leave out someone who is owed one. `dueEmails` still decides.
 *
 * What depends on the conference alone (released, unlocked, the phase, a reminder's window) is
 * decided here in TypeScript: a kind that cannot be owed adds nothing to the query. **A change to
 * a rule in `dueEmails` needs the same change here.**
 */

/** Tries before a failed mail is given up on. */
export const MAX_ATTEMPTS = 3;

type Conference = EmailSnapshot['conference'];

const DAY = 24 * 60 * 60 * 1000;
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
/**
 * A moment as the `timestamp` columns hold it: UTC without a zone. A `Date` parameter would go
 * out in the server's local time, which the cast to `timestamp` would take as UTC.
 */
const at = (date: Date) => sql`${date.toISOString()}::timestamptz at time zone 'UTC'`;
type Column = SQL | SQL.Aliased | { getSQL(): SQL };

/** Whether the log closed the mail: sent, skipped, or failed for good. Automatic rows only. */
const closed = ({
	conferenceId,
	kind,
	userId,
	key
}: {
	conferenceId: string;
	kind: AutomaticEmailKind;
	userId: Column;
	key: Column | string;
}) => sql`exists (
	select 1 from email_log l
	where l.conference_id = ${conferenceId} and l.kind = ${kind}::email_kind
		and l.user_id = ${userId} and l.subject_key = ${key} and l.trigger = 'AUTOMATIC'
		and (l.status in ('SENT', 'SKIPPED') or (l.status = 'FAILED' and l.attempts >= ${MAX_ATTEMPTS})))`;

type ParticipantRow = typeof schema.conferenceParticipant;

/** What a participant predicate is built from: the row and the conference's facts. */
interface Ctx {
	conference: Conference;
	now: Date;
	/** The participant row the filter is on: its own columns are read without a subquery. */
	row: ParticipantRow;
	id: Column;
	userId: Column;
	/** `not closed(kind, key)` for this participant. */
	open: (args: { kind: AutomaticEmailKind; key: Column | string }) => SQL;
}

const memberOf = (ctx: Ctx, condition: SQL) => sql`exists (
	select 1 from delegation_member dm join delegation d on d.id = dm.delegation_id
	where dm.conference_participant_id = ${ctx.id} and ${condition})`;
const singleOf = (ctx: Ctx, condition: SQL) => sql`exists (
	select 1 from single_participant sp
	where sp.conference_participant_id = ${ctx.id} and ${condition})`;
// `offset 0` keeps the subquery correlated: without it Postgres may hash it over every supervisor
// of every conference, checking each one's students, once per page
const supervisorOf = (ctx: Ctx, condition: SQL) => sql`exists (
	select 1 from conference_supervisor cs
	where cs.conference_participant_id = ${ctx.id} and ${condition} offset 0)`;

/** Whether the participant `id` (a column or an expression) has a seat, or applied. */
const seated = (id: Column) => sql`(exists (
	select 1 from delegation_member sdm join delegation sd on sd.id = sdm.delegation_id
	where sdm.conference_participant_id = ${id} and sd.assigned_role_id is not null)
	or exists (select 1 from single_participant ssp
		where ssp.conference_participant_id = ${id} and ssp.assigned_role_id is not null))`;
const applied = (id: Column) => sql`(exists (
	select 1 from delegation_member adm join delegation ad on ad.id = adm.delegation_id
	where adm.conference_participant_id = ${id} and ad.applied)
	or exists (select 1 from single_participant asp
		where asp.conference_participant_id = ${id} and asp.applied))`;
/** Some student of the supervisor row `cs` (in scope) is `condition` (on `s.b`). */
const someStudent = (condition: (studentId: SQL) => SQL) =>
	sql`exists (select 1 from supervision s where s.a = cs.id and ${condition(sql`s.b`)})`;

const hasSeat = (ctx: Ctx) => seated(ctx.id);
/** `accepted`: a seat, or coming along as supervisor of someone with one. */
const accepted = (ctx: Ctx) =>
	sql`(${hasSeat(ctx)} or ${supervisorOf(
		ctx,
		sql`cs.plans_own_attendence_at_conference and ${someStudent(seated)}`
	)})`;

/**
 * Born early enough to be of age, with two days to spare either way (`ofAgeAtConference` counts
 * in local days): `surely` holds only for whom it holds, `maybe` for everyone it may hold for.
 */
function ofAge(conference: Conference) {
	const bound = birthdayBoundsForAge({
		range: { gte: 18 },
		startConference: conference.startConference
	}).lte;
	const shifted = (days: number) =>
		dateKey(bound ? new Date(bound.getTime() + days * DAY) : new Date(0));
	return {
		surely: sql`(u.birthday is not null and u.birthday <= ${shifted(-2)}::date)`,
		maybe: sql`(u.birthday is not null and u.birthday <= ${shifted(2)}::date)`
	};
}

/** The postal paperwork may be done (`maybeDone`), or may still be open (`maybeOpen`). */
function postal(ctx: Ctx) {
	const age = ofAge(ctx.conference);
	const { row } = ctx;
	const done = (
		adult: SQL
	) => sql`(${row.termsAndConditions} = 'DONE' and ${row.mediaConsent} = 'DONE'
		and (${row.guardianConsent} = 'DONE'
			or exists (select 1 from "user" u where u.id = ${row.userId} and ${adult})))`;
	return { maybeDone: done(age.maybe), maybeOpen: sql`not ${done(age.surely)}` };
}

const paymentIs = (ctx: Ctx, done: boolean) =>
	done ? sql`${ctx.row.paymentStatus} = 'DONE'` : sql`${ctx.row.paymentStatus} <> 'DONE'`;

const PROBLEM_FIELDS = [
	'paymentStatus',
	'termsAndConditions',
	'mediaConsent',
	'guardianConsent'
] as const;

/** The published surveys, as `dueEmails` gets them (`loadSurveys`), not answered by the person. */
const openSurvey = (ctx: Ctx, condition: SQL) => sql`exists (
	select 1 from survey_question q
	where q.conference_id = ${ctx.conference.id} and not q.draft and not q.hidden
		and not exists (select 1 from survey_answer a
			where a.question_id = q.id and a.conference_participant_id = ${ctx.id})
		and ${condition})`;

type Predicate = (ctx: Ctx) => SQL | undefined;

const registering = (ctx: Ctx) => ctx.conference.state === 'PARTICIPANT_REGISTRATION';
const released = (ctx: Ctx) => ctx.conference.assignmentReleased;
const when = (gate: boolean, predicate: () => SQL) => (gate ? predicate() : undefined);
/** One per automatic kind about participants; `undefined` when the conference cannot owe it now. */
const PARTICIPANT_PREDICATES: Record<
	Exclude<AutomaticEmailKind, 'WAITING_LIST_REGISTERED' | 'TEAM_WELCOME'>,
	Predicate
> = {
	// A message of one of the person's chats they have not read and were not told about. The
	// quarter of an hour it has to wait, and that only the oldest one counts, is `dueEmails`'.
	UNREAD_MESSAGES: (ctx) =>
		when(
			ctx.conference.messagingEnabled,
			() => sql`exists (
				select 1 from chat c
				join chat_message m on m.chat_id = c.id
					and m.author_participant_id is distinct from ${ctx.id}
				left join chat_read cr on cr.chat_id = c.id and cr.user_id = ${ctx.userId}
				where c.conference_id = ${ctx.conference.id}
					and (c.participant_id = ${ctx.id} or c.other_participant_id = ${ctx.id}
						or (c.kind = 'DELEGATION' and exists (
							select 1 from delegation_member cdm
							where cdm.delegation_id = c.delegation_id
								and cdm.conference_participant_id = ${ctx.id})))
					and (cr.read_at is null or m.created_at > cr.read_at)
					and ${ctx.open({ kind: 'UNREAD_MESSAGES', key: sql`m.id` })})`
		),
	DELEGATION_CREATED: (ctx) =>
		when(registering(ctx), () =>
			memberOf(
				ctx,
				sql`not d.applied and dm.is_head_delegate and ${ctx.open({ kind: 'DELEGATION_CREATED', key: sql`d.id` })}`
			)
		),
	DELEGATION_JOINED: (ctx) =>
		when(registering(ctx), () =>
			memberOf(
				ctx,
				sql`not d.applied and not dm.is_head_delegate and ${ctx.open({ kind: 'DELEGATION_JOINED', key: sql`d.id` })}`
			)
		),
	DELEGATION_MEMBER_JOINED: (ctx) =>
		when(registering(ctx), () =>
			memberOf(
				ctx,
				sql`not d.applied and exists (
					select 1 from delegation_member later
					where later.delegation_id = d.id and later.created_at > dm.created_at
						and ${ctx.open({
							kind: 'DELEGATION_MEMBER_JOINED',
							key: sql`d.id || ':' || later.conference_participant_id`
						})})`
			)
		),
	APPLICATION_SENT: (ctx) =>
		when(
			!released(ctx),
			() =>
				sql`((${memberOf(ctx, sql`d.applied`)} or ${singleOf(ctx, sql`sp.applied`)}) and ${ctx.open({ kind: 'APPLICATION_SENT', key: 'applied' })})`
		),
	ASSIGNMENT_ACCEPTED: (ctx) =>
		when(
			released(ctx),
			() =>
				sql`(${memberOf(ctx, sql`d.assigned_role_id is not null and ${ctx.open({ kind: 'ASSIGNMENT_ACCEPTED', key: sql`d.assigned_role_id` })}`)}
				or ${singleOf(ctx, sql`sp.assigned_role_id is not null and ${ctx.open({ kind: 'ASSIGNMENT_ACCEPTED', key: sql`sp.assigned_role_id` })}`)})`
		),
	WAITING_LIST_SEATED: (ctx) =>
		when(
			released(ctx),
			() => sql`exists (
				select 1 from waiting_list_entry w
				where w.conference_id = ${ctx.conference.id} and w.user_id = ${ctx.userId}
					and w.assigned_at is not null
					and ${ctx.open({ kind: 'WAITING_LIST_SEATED', key: sql`w.id` })})`
		),
	ASSIGNMENT_REJECTED: (ctx) =>
		when(
			released(ctx),
			() =>
				sql`((${memberOf(ctx, sql`d.applied and d.assigned_role_id is null`)} or ${singleOf(ctx, sql`sp.applied and sp.assigned_role_id is null`)})
				and ${ctx.open({ kind: 'ASSIGNMENT_REJECTED', key: 'rejected' })})`
		),
	SUPERVISOR_ASSIGNMENT_SUMMARY: (ctx) =>
		when(released(ctx), () =>
			supervisorOf(
				ctx,
				sql`${someStudent(applied)} and ${ctx.open({ kind: 'SUPERVISOR_ASSIGNMENT_SUMMARY', key: 'summary' })}`
			)
		),
	POSTAL_UNLOCKED: (ctx) =>
		when(
			released(ctx) && ctx.conference.unlockPostals,
			() =>
				sql`(${accepted(ctx)} and ${postal(ctx).maybeOpen} and ${ctx.open({ kind: 'POSTAL_UNLOCKED', key: 'postal' })})`
		),
	PAYMENT_UNLOCKED: (ctx) =>
		when(
			released(ctx) && ctx.conference.unlockPayments,
			() =>
				sql`(${accepted(ctx)} and ${paymentIs(ctx, false)} and ${ctx.open({ kind: 'PAYMENT_UNLOCKED', key: 'payment' })})`
		),
	POSTAL_RECEIVED: (ctx) =>
		when(
			released(ctx),
			() =>
				sql`(${accepted(ctx)} and ${postal(ctx).maybeDone} and ${ctx.open({ kind: 'POSTAL_RECEIVED', key: 'postal' })})`
		),
	PAYMENT_RECEIVED: (ctx) =>
		when(
			released(ctx),
			() =>
				sql`(${accepted(ctx)} and ${paymentIs(ctx, true)} and ${ctx.open({ kind: 'PAYMENT_RECEIVED', key: 'payment' })})`
		),
	PAPERWORK_PROBLEM: (ctx) =>
		when(released(ctx), () => {
			const fields = PROBLEM_FIELDS.map(
				(field) =>
					sql`(${ctx.row[field]} = 'PROBLEM' and ${ctx.open({ kind: 'PAPERWORK_PROBLEM', key: field })})`
			);
			return sql`((${sql.join(fields, sql` or `)}) and ${accepted(ctx)})`;
		}),
	APPLICATION_DEADLINE_REMINDER: (ctx) =>
		when(
			registering(ctx) &&
				inWindowBefore({
					now: ctx.now,
					date: ctx.conference.applicationDeadline,
					days: APPLICATION_REMINDER_DAYS
				}),
			() =>
				sql`((${memberOf(ctx, sql`not d.applied`)} or ${singleOf(ctx, sql`not sp.applied`)}) and ${ctx.open(
					{
						kind: 'APPLICATION_DEADLINE_REMINDER',
						key: dateKey(ctx.conference.applicationDeadline)
					}
				)})`
		),
	OPEN_ISSUES_REMINDER: (ctx) => {
		const { unlockPostals, unlockPayments, startConference } = ctx.conference;
		const open = [
			...(unlockPostals ? [postal(ctx).maybeOpen] : []),
			...(unlockPayments ? [paymentIs(ctx, false)] : [])
		];
		return when(
			released(ctx) &&
				open.length > 0 &&
				inWindowBefore({ now: ctx.now, date: startConference, days: OPEN_ISSUES_REMINDER_DAYS }),
			() =>
				sql`(${accepted(ctx)} and (${sql.join(open, sql` or `)}) and ${ctx.open({ kind: 'OPEN_ISSUES_REMINDER', key: 'open-issues' })})`
		);
	},
	PHONE_READY_REMINDER: (ctx) =>
		when(
			released(ctx) &&
				inWindowBefore({
					now: ctx.now,
					date: ctx.conference.startConference,
					days: PHONE_READY_REMINDER_DAYS
				}),
			() => sql`(${accepted(ctx)} and ${ctx.open({ kind: 'PHONE_READY_REMINDER', key: 'phone' })})`
		),
	CHASE_INTRO_REMINDER: (ctx) =>
		when(
			!!ctx.conference.chaseUrl &&
				released(ctx) &&
				inWindowBefore({
					now: ctx.now,
					date: ctx.conference.startConference,
					days: CHASE_INTRO_REMINDER_DAYS
				}),
			() =>
				sql`(${hasSeat(ctx)} and ${ctx.open({
					kind: 'CHASE_INTRO_REMINDER',
					key: dateKey(ctx.conference.startConference)
				})})`
		),
	// The survey's own window and key are left to `dueEmails`: only the seated who have not
	// answered an open survey in its last days, without looking at the log
	SURVEY_REMINDER: (ctx) =>
		when(
			released(ctx),
			() =>
				sql`(${hasSeat(ctx)} and ${openSurvey(
					ctx,
					sql`q.deadline > ${at(ctx.now)}
						and q.deadline <= ${at(new Date(ctx.now.getTime() + SURVEY_REMINDER_DAYS * DAY))}`
				)})`
		),
	SURVEY_PUBLISHED: (ctx) =>
		when(
			released(ctx),
			() =>
				sql`(${hasSeat(ctx)} and ${openSurvey(
					ctx,
					sql`q.deadline > ${at(ctx.now)} and ${ctx.open({ kind: 'SURVEY_PUBLISHED', key: sql`q.id` })}`
				)})`
		),
	CERTIFICATE_AVAILABLE: (ctx) =>
		when(
			ctx.conference.state === 'POST' && ctx.conference.certificateAvailable,
			() =>
				sql`(${ctx.row.didAttend} and ${ctx.open({ kind: 'CERTIFICATE_AVAILABLE', key: 'certificate' })})`
		),
	SUPERVISOR_STUDENT_LINKED: (ctx) =>
		supervisorOf(
			ctx,
			sql`exists (select 1 from supervision s where s.a = cs.id
				and ${ctx.open({ kind: 'SUPERVISOR_STUDENT_LINKED', key: sql`s.b` })})`
		),
	SUPERVISOR_CONNECTED: (ctx) => sql`exists (
		select 1 from supervision s join conference_supervisor cs on cs.id = s.a
		where s.b = ${ctx.id}
			and ${ctx.open({ kind: 'SUPERVISOR_CONNECTED', key: sql`cs.conference_participant_id` })})`,
	PAPER_REVIEWED: (ctx) => sql`exists (
		select 1 from paper pa
		join paper_version pv on pv.paper_id = pa.id
		join paper_review r on r.paper_version_id = pv.id
		where pa.author_participant_id = ${ctx.id}
			and ${ctx.open({ kind: 'PAPER_REVIEWED', key: sql`r.id` })})`
};

/**
 * The filter on `conference_participant` (`row`, as the query aliases it) for the people who may
 * be owed a mail of `kinds` at `now`; `false` when none can be.
 */
export function participantCandidates({
	conference,
	kinds,
	now,
	row
}: {
	conference: Conference;
	kinds: ReadonlySet<string>;
	now: Date;
	row: ParticipantRow;
}): SQL {
	const { id, userId } = row;
	const ctx: Ctx = {
		conference,
		now,
		row,
		id,
		userId,
		open: ({ kind, key }) => sql`not ${closed({ conferenceId: conference.id, kind, userId, key })}`
	};
	const predicates = Object.entries(PARTICIPANT_PREDICATES).flatMap(([kind, predicate]) => {
		if (!kinds.has(kind)) return [];
		const built = predicate(ctx);
		return built ? [built] : [];
	});
	return predicates.length > 0 ? sql`(${sql.join(predicates, sql` or `)})` : sql`false`;
}

/** The waiting list entries (`id`, `userId` their columns) not yet told they wait. */
export const waitingListCandidates = ({
	conferenceId,
	id,
	userId
}: {
	conferenceId: string;
	id: Column;
	userId: Column;
}) => sql`not ${closed({ conferenceId, kind: 'WAITING_LIST_REGISTERED', userId, key: id })}`;

/**
 * The team members (`id`, `userId` their columns) who may be owed a mail of `kinds`: not yet
 * welcomed, or, while the chats are on, anybody (a team is small, and which inboxes somebody
 * answers is `loadUnreadOfTeam`'s to work out); `false` when none can be.
 */
export function teamCandidates({
	conference,
	kinds,
	id,
	userId
}: {
	conference: Conference;
	kinds: ReadonlySet<string>;
	id: Column;
	userId: Column;
}): SQL {
	if (kinds.has('UNREAD_MESSAGES') && conference.messagingEnabled) return sql`true`;
	return kinds.has('TEAM_WELCOME')
		? sql`not ${closed({ conferenceId: conference.id, kind: 'TEAM_WELCOME', userId, key: id })}`
		: sql`false`;
}
