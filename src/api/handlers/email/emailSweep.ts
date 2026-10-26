import { db, schema } from '#api/db/db.js';
import { emailService } from '#api/services/email/emailService.js';
import { localeOfUser, runWithLocale } from '#api/services/requestLocale.js';
import { renderEmail, NotificationEmail } from '#lib/emails/index.js';
import { emailLogPubsub } from '#api/pubsub.js';
import { sql } from 'drizzle-orm';
import {
	dueEmails,
	emailKey,
	type DueEmail,
	type EmailKind,
	type EmailSnapshot,
	type SnapshotPerson
} from './dueEmails';
import { loadEmailSnapshot } from './emailSnapshot';
import { emailContent, recipientName, type ConferenceEmailText } from './emailContent';
import type { EmailTextOverride } from '#lib/helpers/emailTemplates.js';

/**
 * Sends what `dueEmails` says a conference owes and nobody sent yet. Each mail is claimed by
 * writing its log row first (unique per conference, kind, person and subject), so two sweeps -
 * a mutation's and the job's, or two instances' - never send one mail twice. A failed mail is tried
 * again by later sweeps, up to `MAX_ATTEMPTS`; a claim left behind by a process that died is free
 * again after `STALE_CLAIM_MINUTES`.
 */

const MAX_ATTEMPTS = 3;
const STALE_CLAIM_MINUTES = 15;

type LogState = {
	status: (typeof schema.emailStatus.enumValues)[number];
	attempts: number;
	updatedAt: Date;
};

/** Whether a mail with this log state (or none) is still to be sent. */
export function isOpen(log: LogState | undefined, now: Date) {
	if (!log) return true;
	if (log.status === 'FAILED') return log.attempts < MAX_ATTEMPTS;
	if (log.status === 'SENDING')
		return now.getTime() - log.updatedAt.getTime() > STALE_CLAIM_MINUTES * 60_000;
	return false;
}

async function enabledKinds(conferenceId: string) {
	const settings = await db.query.conferenceEmailSetting.findMany({
		where: { conferenceId, enabled: true },
		columns: { kind: true }
	});
	return new Set<EmailKind>(settings.map((setting) => setting.kind));
}

/** The mails of `kinds` the conference owes and has not sent, skipped or given up on. */
async function openEmails(snapshot: EmailSnapshot, kinds: ReadonlySet<EmailKind>, now: Date) {
	const logs = await db.query.emailLog.findMany({
		where: { conferenceId: snapshot.conference.id },
		columns: {
			kind: true,
			userId: true,
			subjectKey: true,
			status: true,
			attempts: true,
			updatedAt: true
		}
	});
	const logByKey = new Map(logs.map((log) => [emailKey(log), log]));
	return dueEmails(snapshot, now).filter(
		(email) =>
			kinds.has(email.kind) &&
			isOpen(logByKey.get(emailKey({ ...email, userId: email.person.user.id })), now)
	);
}

/** Claims the mail; `undefined` when another sweep holds or finished it. */
async function claim(conferenceId: string, email: DueEmail) {
	const now = new Date();
	const [claimed] = await db
		.insert(schema.emailLog)
		.values({
			conferenceId,
			kind: email.kind,
			userId: email.person.user.id,
			subjectKey: email.subjectKey,
			status: 'SENDING',
			attempts: 1,
			email: email.person.user.email
		})
		.onConflictDoUpdate({
			target: [
				schema.emailLog.conferenceId,
				schema.emailLog.kind,
				schema.emailLog.userId,
				schema.emailLog.subjectKey
			],
			set: {
				status: 'SENDING',
				attempts: sql`${schema.emailLog.attempts} + 1`,
				email: email.person.user.email,
				error: null,
				updatedAt: now
			},
			setWhere: sql`(${schema.emailLog.status} = 'FAILED' and ${schema.emailLog.attempts} < ${MAX_ATTEMPTS})
				or (${schema.emailLog.status} = 'SENDING'
					and ${schema.emailLog.updatedAt} < ${new Date(now.getTime() - STALE_CLAIM_MINUTES * 60_000)})`
		})
		.returning({ id: schema.emailLog.id });
	return claimed?.id;
}

/** The texts the conference wrote itself, every kind and language. */
function loadEmailTexts(conferenceId: string): Promise<ConferenceEmailText[]> {
	return db.query.conferenceEmailText.findMany({
		where: { conferenceId },
		columns: { kind: true, locale: true, subject: true, heading: true, body: true }
	});
}

/** Renders one mail in the recipient's language, in the conference's own words where it has them. */
function renderAutomaticEmail(
	email: DueEmail,
	conference: EmailSnapshot['conference'],
	origin: string,
	texts: readonly ConferenceEmailText[]
) {
	return runWithLocale(localeOfUser(email.person.user.locale), async () => {
		const content = emailContent(email, conference, origin, texts);
		const { html, text } = await renderEmail(NotificationEmail, {
			heading: content.heading,
			recipientName: recipientName(email.person),
			paragraphs: content.paragraphs,
			items: content.items,
			closing: content.closing,
			button: content.button,
			conferenceTitle: conference.title
		});
		return { subject: content.subject, html, text };
	});
}

/** Records how sending went: sent, or failed with why. */
async function settle(logId: string, error: string | undefined) {
	await db
		.update(schema.emailLog)
		.set(
			error === undefined
				? { status: 'SENT', sentAt: new Date(), error: null }
				: { status: 'FAILED', error }
		)
		.where(sql`${schema.emailLog.id} = ${logId}`);
	return error === undefined;
}

/** Sends one claimed mail; whatever goes wrong is written to its log row, never thrown. */
async function send(
	email: DueEmail,
	snapshot: EmailSnapshot,
	origin: string,
	texts: readonly ConferenceEmailText[],
	logId: string
) {
	try {
		const { subject, html, text } = await renderAutomaticEmail(
			email,
			snapshot.conference,
			origin,
			texts
		);
		const result = await emailService.sendEmail({
			to: email.person.user.email,
			subject,
			html,
			text
		});
		return settle(logId, result.success ? undefined : (result.error ?? 'unknown error'));
	} catch (error) {
		return settle(logId, error instanceof Error ? error.message : String(error));
	}
}

/** Claims and sends each mail in turn, counting what went out and what failed. */
async function sendEach(
	conferenceId: string,
	batch: DueEmail[],
	send: (email: DueEmail, logId: string) => Promise<boolean>
) {
	let sent = 0;
	let failed = 0;
	for (const email of batch) {
		const logId = await claim(conferenceId, email);
		if (!logId) continue;
		if (await send(email, logId)) sent++;
		else failed++;
	}
	return { sent, failed };
}

/**
 * Sends up to `limit` of the mails the conference owes. Answers how many went out, failed, and are
 * left for the next round.
 */
export async function sendDueEmails(args: {
	conferenceId: string;
	origin: string;
	limit?: number;
	now?: Date;
}) {
	const now = args.now ?? new Date();
	const kinds = await enabledKinds(args.conferenceId);
	if (kinds.size === 0) return { sent: 0, failed: 0, remaining: 0 };
	const snapshot = await loadEmailSnapshot(args.conferenceId);
	if (!snapshot) return { sent: 0, failed: 0, remaining: 0 };

	const open = await openEmails(snapshot, kinds, now);
	const batch = open.slice(0, args.limit ?? 200);
	const texts = await loadEmailTexts(args.conferenceId);
	const counts = await sendEach(args.conferenceId, batch, (email, logId) =>
		send(email, snapshot, args.origin, texts, logId)
	);
	if (batch.length > 0) emailLogPubsub.updated();
	return { ...counts, remaining: open.length - batch.length };
}

/** How many mails of `kind` the conference owes right now and has not sent. */
export async function countOpenEmails(conferenceId: string, kind: EmailKind) {
	const snapshot = await loadEmailSnapshot(conferenceId);
	if (!snapshot) return 0;
	return (await openEmails(snapshot, new Set([kind]), new Date())).length;
}

/**
 * Marks what the conference owes of `kind` right now as skipped, so switching a kind on only
 * reaches what happens from then on.
 */
export async function skipOpenEmails(conferenceId: string, kind: EmailKind) {
	const snapshot = await loadEmailSnapshot(conferenceId);
	if (!snapshot) return;
	const open = await openEmails(snapshot, new Set([kind]), new Date());
	for (let start = 0; start < open.length; start += 500) {
		await db
			.insert(schema.emailLog)
			.values(
				open.slice(start, start + 500).map((email) => ({
					conferenceId,
					kind: email.kind,
					userId: email.person.user.id,
					subjectKey: email.subjectKey,
					status: 'SKIPPED' as const,
					email: email.person.user.email
				}))
			)
			.onConflictDoNothing();
	}
	emailLogPubsub.updated();
}

/** Every conference that sends any automatic mail. */
export async function conferencesSendingEmails() {
	const settings = await db.query.conferenceEmailSetting.findMany({
		where: { enabled: true },
		columns: { conferenceId: true }
	});
	return [...new Set(settings.map((setting) => setting.conferenceId))];
}

// The sweeps this process runs after a mutation, one per conference at a time; a request while one
// runs makes it go again once it is done, so nothing that changed meanwhile waits for the job.
const running = new Map<string, { again: boolean }>();

/** Sends what the conference owes now, in the background; the caller does not wait. */
export function scheduleEmailSweep(conferenceId: string, origin: string) {
	const current = running.get(conferenceId);
	if (current) {
		current.again = true;
		return;
	}
	const state = { again: false };
	running.set(conferenceId, state);
	void (async () => {
		try {
			do {
				state.again = false;
				let result = await sendDueEmails({ conferenceId, origin });
				while (result.remaining > 0) result = await sendDueEmails({ conferenceId, origin });
			} while (state.again);
		} catch (error) {
			console.error('Sending automatic emails failed', error);
		} finally {
			running.delete(conferenceId);
		}
	})();
}

/** A mail of `kind` as the conference would send it, addressed to `user` with made-up details. */
export async function previewEmail(
	conferenceId: string,
	kind: EmailKind,
	user: SnapshotPerson['user'],
	origin: string,
	/** Text being edited, shown instead of what is stored (in `user.locale`). */
	draft?: EmailTextOverride
) {
	const snapshot = await loadEmailSnapshot(conferenceId);
	if (!snapshot) return undefined;
	const sample = (
		person: Partial<SnapshotPerson> & { user: SnapshotPerson['user'] }
	): SnapshotPerson => ({
		participantId: person.user.id,
		paymentStatus: 'PENDING',
		termsAndConditions: 'PENDING',
		guardianConsent: 'PENDING',
		mediaConsent: 'PENDING',
		didAttend: true,
		delegation: {
			applied: true,
			role: { id: 'sample', kind: 'NATION', name: null, nationAlpha3Code: 'FRA' },
			committee: 'GV'
		},
		single: null,
		supervisor: null,
		seatedFromWaitingList: null,
		...person
	});
	const student = sample({
		user: { ...user, id: 'sample-student', givenName: 'Alex', familyName: 'Beispiel' }
	});
	const rejectedStudent = sample({
		user: { ...user, id: 'sample-student-2', givenName: 'Kim', familyName: 'Muster' },
		delegation: { applied: true, role: null, committee: null }
	});
	const email: DueEmail = {
		kind,
		subjectKey: 'preview',
		person: sample({ user }),
		students: [student, rejectedStudent],
		student,
		field: 'termsAndConditions'
	};
	const texts = draft
		? [{ kind, locale: localeOfUser(user.locale), ...draft }]
		: await loadEmailTexts(conferenceId);
	return renderAutomaticEmail(email, snapshot.conference, origin, texts);
}
