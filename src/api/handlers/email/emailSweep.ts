import { db, schema } from '#api/db/db';
import { emailLogPubsub } from '#api/pubsub';
import { sql } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import {
	dueEmails,
	emailKey,
	type DueEmail,
	type EmailKind,
	type EmailSnapshot
} from './dueEmails';
import {
	emailPages,
	FIRST_EMAIL_PAGE,
	loadEmailConference,
	type EmailCursor
} from './emailSnapshot';
import { REMINDER_KINDS } from '#lib/helpers/emailKinds';
import { lastReminders, spaceReminders } from './reminderSpacing';
import {
	deliver,
	loadWording,
	renderAutomaticEmail,
	type ConferenceWording
} from './emailDelivery';
import { emailsPerSecondOf, enabledKinds } from './emailSettings';
import { roundLimit } from './emailPacing';
import { emailPacer } from './emailPacer';
import { MAX_ATTEMPTS } from './emailCandidates';
import { logger } from '#lib/logger';
import { bundleEmails, type EmailBundle } from './emailBundles';

/**
 * Sends what `dueEmails` says a conference owes and nobody sent yet: the kinds switched to automatic
 * when the `send-emails` job asks, any kinds the team picks when it sends them by hand. Nothing else
 * sends: a mutation only changes what is owed. Each mail is claimed by writing its log row first
 * (unique per conference, kind, person and subject), so two sweeps - the team's and the job's, or
 * two instances' - never send one mail twice. A failed mail is tried
 * again by later sweeps, up to `MAX_ATTEMPTS`; a claim left behind by a process that died is free
 * again after `STALE_CLAIM_MINUTES`. A mail the team sent by hand counts as sent, unless it was a
 * reminder: that still leaves the automatic one due. Mails of a bundled kind due together go out as
 * one (`emailBundles.ts`), each keeping its own log row.
 */

const STALE_CLAIM_MINUTES = 15;

type LogState = {
	status: (typeof schema.emailStatus.enumValues)[number];
	attempts: number;
	updatedAt: Date;
};

/** Whether a mail with this log state (or none) is still to be sent. */
export function isOpen({ log, now }: { log: LogState | undefined; now: Date }) {
	if (!log) return true;
	if (log.status === 'FAILED') return log.attempts < MAX_ATTEMPTS;
	if (log.status === 'SENDING')
		return now.getTime() - log.updatedAt.getTime() > STALE_CLAIM_MINUTES * 60_000;
	return false;
}

/**
 * The mails of `kinds` the conference owes and has not sent, skipped or given up on. `spaced` holds
 * back the reminders a person would get too soon after another (`spaceReminders`): what a sweep
 * sends, not what the team is told is owed.
 */
async function openEmails({
	snapshot,
	kinds,
	now,
	spaced = false
}: {
	snapshot: EmailSnapshot;
	kinds: ReadonlySet<EmailKind>;
	now: Date;
	spaced?: boolean;
}) {
	const due = dueEmails({ snapshot, now }).filter((email) => kinds.has(email.kind));
	const userIds = [...new Set(due.map((email) => email.recipient.id))];
	if (userIds.length === 0) return [];
	// only the log of the page's recipients: every kind, since reminders space after all of theirs
	const logs = await db.query.emailLog.findMany({
		where: { conferenceId: snapshot.conference.id, userId: { in: userIds } },
		columns: {
			kind: true,
			userId: true,
			subjectKey: true,
			trigger: true,
			status: true,
			attempts: true,
			updatedAt: true
		}
	});
	const open = stillOpen({ due, logs, kinds, now });
	return spaced ? spaceReminders({ due: open, lastReminderAt: lastReminders(logs), now }) : open;
}

type LogRow = LogState & {
	kind: EmailKind;
	userId: string | null;
	subjectKey: string;
	trigger: (typeof schema.emailTrigger.enumValues)[number];
};

const isReminder = (kind: EmailKind) => REMINDER_KINDS.some((reminder) => reminder === kind);

/**
 * The mails of `kinds` among `due` that are still to be sent, after the log. A mail sent by hand
 * counts as sent, except a reminder: that leaves the automatic one due.
 */
export function stillOpen({
	due,
	logs,
	kinds,
	now
}: {
	due: readonly DueEmail[];
	logs: readonly LogRow[];
	kinds: ReadonlySet<EmailKind>;
	now: Date;
}) {
	const automatic = new Map(
		logs.filter((log) => log.trigger === 'AUTOMATIC').map((log) => [emailKey(log), log])
	);
	const sentByHand = new Set(
		logs
			.filter((log) => log.trigger === 'MANUAL' && log.status === 'SENT' && !isReminder(log.kind))
			.map(emailKey)
	);
	return due.filter((email) => {
		const key = emailKey({ ...email, userId: email.recipient.id });
		return (
			kinds.has(email.kind) && !sentByHand.has(key) && isOpen({ log: automatic.get(key), now })
		);
	});
}

/** Claims the mail; `undefined` when another sweep holds or finished it. */
async function claim({ conferenceId, email }: { conferenceId: string; email: DueEmail }) {
	const now = new Date();
	const [claimed] = await db
		.insert(schema.emailLog)
		.values({
			conferenceId,
			kind: email.kind,
			userId: email.recipient.id,
			subjectKey: email.subjectKey,
			status: 'SENDING',
			attempts: 1,
			email: email.recipient.email
		})
		.onConflictDoUpdate({
			target: [
				schema.emailLog.conferenceId,
				schema.emailLog.kind,
				schema.emailLog.userId,
				schema.emailLog.subjectKey
			],
			// the unique index covers the automatic rows only
			targetWhere: sql`${schema.emailLog.trigger} = 'AUTOMATIC'`,
			set: {
				status: 'SENDING',
				attempts: sql`${schema.emailLog.attempts} + 1`,
				email: email.recipient.email,
				error: null,
				updatedAt: now
			},
			setWhere: whereRows({
				table: schema.emailLog,
				filter: {
					OR: [
						{ status: 'FAILED', attempts: { lt: MAX_ATTEMPTS } },
						{
							status: 'SENDING',
							updatedAt: { lt: new Date(now.getTime() - STALE_CLAIM_MINUTES * 60_000) }
						}
					]
				}
			})
		})
		.returning({ id: schema.emailLog.id });
	return claimed?.id;
}

/** Sends one claimed mail; whatever goes wrong is written to its log rows, never thrown. */
async function send({
	bundle,
	snapshot,
	origin,
	wording,
	logIds
}: {
	bundle: EmailBundle;
	snapshot: EmailSnapshot;
	origin: string;
	wording: ConferenceWording;
	logIds: string[];
}) {
	const [email] = bundle;
	const error = await deliver({
		logIds,
		to: email.recipient.email,
		render: () =>
			renderAutomaticEmail({ email, bundle, conference: snapshot.conference, origin, wording })
	});
	return error === undefined;
}

/**
 * Claims each mail of a bundle and sends what it got hold of as one, bundle by bundle, counting
 * the mails that went out and failed.
 */
async function sendEach({
	conferenceId,
	batch,
	perSecond,
	send
}: {
	conferenceId: string;
	batch: EmailBundle[];
	perSecond: number | null;
	send: (bundle: EmailBundle, logIds: string[]) => Promise<boolean>;
}) {
	let sent = 0;
	let failed = 0;
	const logIds: string[] = [];
	for (const bundle of batch) {
		const claimed: DueEmail[] = [];
		const claimedIds: string[] = [];
		for (const email of bundle) {
			const logId = await claim({ conferenceId, email });
			if (!logId) continue;
			claimed.push(email);
			claimedIds.push(logId);
		}
		const [first, ...rest] = claimed;
		if (!first) continue;
		logIds.push(...claimedIds);
		await emailPacer.wait({ key: conferenceId, perSecond });
		if (await send([first, ...rest], claimedIds)) sent++;
		else failed++;
	}
	return { sent, failed, logIds };
}

/**
 * Sends up to `limit` of the mails the conference owes, of `kinds` (by hand), else of the kinds
 * switched to automatic, no faster than the conference's `emailsPerSecond` (and then no more than
 * a minute's worth). Reads the conference a page at a time from `from`, and answers how many went
 * out and failed, and where the next round goes on (`null` once nothing is left).
 */
export async function sendDueEmails({
	conferenceId,
	origin,
	kinds: chosen,
	from = FIRST_EMAIL_PAGE,
	limit = 200,
	now = new Date()
}: {
	conferenceId: string;
	origin: string;
	kinds?: ReadonlySet<EmailKind>;
	from?: EmailCursor;
	limit?: number;
	now?: Date;
}): Promise<{ sent: number; failed: number; next: EmailCursor | null }> {
	const kinds = chosen ?? (await enabledKinds(conferenceId));
	const conference = kinds.size > 0 ? await loadEmailConference(conferenceId) : undefined;
	if (!conference) return { sent: 0, failed: 0, next: null };

	const perSecond = await emailsPerSecondOf(conferenceId);
	const wording = await loadWording(conferenceId);
	let room = roundLimit({ limit, perSecond });
	let sent = 0;
	let failed = 0;
	const logIds: string[] = [];
	let next: EmailCursor | null = null;
	for await (const page of emailPages({ conference, kinds, now, from })) {
		const open = bundleEmails(
			await openEmails({ snapshot: page.snapshot, kinds, now, spaced: true })
		);
		const batch = open.slice(0, room);
		const result = await sendEach({
			conferenceId,
			batch,
			perSecond,
			send: (bundle, logIds) => send({ bundle, snapshot: page.snapshot, origin, wording, logIds })
		});
		sent += result.sent;
		failed += result.failed;
		logIds.push(...result.logIds);
		room -= batch.length;
		// the rest of this page, or the pages after it, are the next round's
		if (open.length > batch.length) {
			next = page.cursor;
			break;
		}
		if (room <= 0) {
			next = page.next;
			break;
		}
	}
	// a claim either inserts the row or retries an existing one
	if (logIds.length > 0) {
		emailLogPubsub.created();
		emailLogPubsub.updated(logIds);
	}
	return { sent, failed, next };
}

/** How many mails of each of `kinds` the conference owes right now and has not sent. */
export async function countOpenEmails({
	conferenceId,
	kinds,
	now = new Date()
}: {
	conferenceId: string;
	kinds: readonly EmailKind[];
	now?: Date;
}) {
	const counts = new Map(kinds.map((kind) => [kind, 0]));
	const conference = kinds.length > 0 ? await loadEmailConference(conferenceId) : undefined;
	if (conference) {
		const wanted = new Set(kinds);
		for await (const { snapshot } of emailPages({ conference, kinds: wanted, now })) {
			for (const email of await openEmails({ snapshot, kinds: wanted, now }))
				counts.set(email.kind, (counts.get(email.kind) ?? 0) + 1);
		}
	}
	return kinds.map((kind) => ({ kind, open: counts.get(kind) ?? 0 }));
}

/**
 * Marks what the conference owes of `kinds` right now as skipped, so switching a kind on only
 * reaches what happens from then on. Answers how many mails that was.
 */
export async function skipOpenEmails({
	conferenceId,
	kinds
}: {
	conferenceId: string;
	kinds: readonly EmailKind[];
}) {
	const conference = kinds.length > 0 ? await loadEmailConference(conferenceId) : undefined;
	if (!conference) return 0;
	const wanted = new Set(kinds);
	const now = new Date();
	let skipped = 0;
	for await (const { snapshot } of emailPages({ conference, kinds: wanted, now })) {
		const open = await openEmails({ snapshot, kinds: wanted, now });
		for (let start = 0; start < open.length; start += 500) {
			await db
				.insert(schema.emailLog)
				.values(
					open.slice(start, start + 500).map((email) => ({
						conferenceId,
						kind: email.kind,
						userId: email.recipient.id,
						subjectKey: email.subjectKey,
						status: 'SKIPPED' as const,
						email: email.recipient.email
					}))
				)
				.onConflictDoNothing();
		}
		skipped += open.length;
	}
	if (skipped > 0) emailLogPubsub.created();
	return skipped;
}

// The sweeps the team started by hand, one per conference at a time; kinds asked for while one runs
// are sent once it is done.
const running = new Map<string, { kinds: Set<EmailKind> }>();

/**
 * Sends everything of `kinds` the conference owes, in the background; the caller does not wait.
 * Kinds that are not switched to automatic are sent too: this is the team sending them by hand.
 */
export function sendOpenEmailsInBackground({
	conferenceId,
	kinds,
	origin
}: {
	conferenceId: string;
	kinds: readonly EmailKind[];
	origin: string;
}) {
	const current = running.get(conferenceId);
	if (current) {
		for (const kind of kinds) current.kinds.add(kind);
		return;
	}
	const state = { kinds: new Set(kinds) };
	running.set(conferenceId, state);
	void (async () => {
		try {
			while (state.kinds.size > 0) {
				const batch = new Set(state.kinds);
				state.kinds.clear();
				let result = await sendDueEmails({ conferenceId, origin, kinds: batch });
				while (result.next && result.sent + result.failed > 0)
					result = await sendDueEmails({ conferenceId, origin, kinds: batch, from: result.next });
			}
		} catch (error) {
			logger.error('Sending emails failed', { conferenceId, err: error });
		} finally {
			running.delete(conferenceId);
		}
	})();
}
