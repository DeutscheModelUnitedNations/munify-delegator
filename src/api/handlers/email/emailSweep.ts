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
import { loadEmailSnapshot } from './emailSnapshot';
import { REMINDER_KINDS } from '#lib/helpers/emailKinds';
import {
	deliver,
	loadWording,
	renderAutomaticEmail,
	type ConferenceWording
} from './emailDelivery';
import { enabledKinds } from './emailSettings';
import { logger } from '#lib/logger';

/**
 * Sends what `dueEmails` says a conference owes and nobody sent yet: the kinds switched to automatic
 * when the `send-emails` job asks, any kinds the team picks when it sends them by hand. Nothing else
 * sends: a mutation only changes what is owed. Each mail is claimed by writing its log row first
 * (unique per conference, kind, person and subject), so two sweeps - the team's and the job's, or
 * two instances' - never send one mail twice. A failed mail is tried
 * again by later sweeps, up to `MAX_ATTEMPTS`; a claim left behind by a process that died is free
 * again after `STALE_CLAIM_MINUTES`. A mail the team sent by hand counts as sent, unless it was a
 * reminder: that still leaves the automatic one due.
 */

const MAX_ATTEMPTS = 3;
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

/** The mails of `kinds` the conference owes and has not sent, skipped or given up on. */
async function openEmails({
	snapshot,
	kinds,
	now
}: {
	snapshot: EmailSnapshot;
	kinds: ReadonlySet<EmailKind>;
	now: Date;
}) {
	const logs = await db.query.emailLog.findMany({
		where: { conferenceId: snapshot.conference.id },
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
	return stillOpen({ due: dueEmails({ snapshot, now }), logs, kinds, now });
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

/** Sends one claimed mail; whatever goes wrong is written to its log row, never thrown. */
async function send({
	email,
	snapshot,
	origin,
	wording,
	logId
}: {
	email: DueEmail;
	snapshot: EmailSnapshot;
	origin: string;
	wording: ConferenceWording;
	logId: string;
}) {
	const error = await deliver({
		logId,
		to: email.recipient.email,
		render: () => renderAutomaticEmail({ email, conference: snapshot.conference, origin, wording })
	});
	return error === undefined;
}

/** Claims and sends each mail in turn, counting what went out and what failed. */
async function sendEach({
	conferenceId,
	batch,
	send
}: {
	conferenceId: string;
	batch: DueEmail[];
	send: (email: DueEmail, logId: string) => Promise<boolean>;
}) {
	let sent = 0;
	let failed = 0;
	const logIds: string[] = [];
	for (const email of batch) {
		const logId = await claim({ conferenceId, email });
		if (!logId) continue;
		logIds.push(logId);
		if (await send(email, logId)) sent++;
		else failed++;
	}
	return { sent, failed, logIds };
}

/**
 * Sends up to `limit` of the mails the conference owes, of `kinds` (by hand), else of the kinds
 * switched to automatic. Answers how many went out, failed, and are left for the next round.
 */
export async function sendDueEmails({
	conferenceId,
	origin,
	kinds: chosen,
	limit = 200,
	now = new Date()
}: {
	conferenceId: string;
	origin: string;
	kinds?: ReadonlySet<EmailKind>;
	limit?: number;
	now?: Date;
}) {
	const kinds = chosen ?? (await enabledKinds(conferenceId));
	const snapshot = kinds.size > 0 ? await loadEmailSnapshot(conferenceId) : undefined;
	if (!snapshot) return { sent: 0, failed: 0, remaining: 0 };

	const open = await openEmails({ snapshot, kinds, now });
	const batch = open.slice(0, limit);
	const wording = await loadWording(conferenceId);
	const { logIds, ...counts } = await sendEach({
		conferenceId,
		batch,
		send: (email, logId) => send({ email, snapshot, origin, wording, logId })
	});
	// a claim either inserts the row or retries an existing one
	if (logIds.length > 0) {
		emailLogPubsub.created();
		emailLogPubsub.updated(logIds);
	}
	return { ...counts, remaining: open.length - batch.length };
}

/** How many mails of each of `kinds` the conference owes right now and has not sent. */
export async function countOpenEmails({
	conferenceId,
	kinds
}: {
	conferenceId: string;
	kinds: readonly EmailKind[];
}) {
	const snapshot = await loadEmailSnapshot(conferenceId);
	const open = snapshot
		? await openEmails({ snapshot, kinds: new Set(kinds), now: new Date() })
		: [];
	return kinds.map((kind) => ({
		kind,
		open: open.filter((email) => email.kind === kind).length
	}));
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
	const snapshot = await loadEmailSnapshot(conferenceId);
	if (!snapshot || kinds.length === 0) return 0;
	const open = await openEmails({ snapshot, kinds: new Set(kinds), now: new Date() });
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
	if (open.length > 0) emailLogPubsub.created();
	return open.length;
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
				while (result.remaining > 0 && result.sent + result.failed > 0)
					result = await sendDueEmails({ conferenceId, origin, kinds: batch });
			}
		} catch (error) {
			logger.error('Sending emails failed', { conferenceId, err: error });
		} finally {
			running.delete(conferenceId);
		}
	})();
}
