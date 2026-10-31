import { db, schema } from '#api/db/db';
import { dueEmails, type DueEmail, type EmailKind } from './dueEmails';
import { loadEmailSnapshot } from './emailSnapshot';
import { emailDetail } from './emailContent';
import { enabledKinds } from './emailSweep';
import { loadWording, renderAutomaticEmail, sendByHand } from './emailDelivery';

/**
 * The mails one person is owed right now, which the team can send them by hand from the user card:
 * after changing something by hand while a kind is switched off, again when one went missing, or a
 * reminder before its date (any time before, not only in its last days).
 */

type EmailStatus = (typeof schema.emailStatus.enumValues)[number];

export interface PersonEmail {
	kind: EmailKind;
	subjectKey: string;
	/** What tells it apart from the person's other mails of its kind. */
	detail: string | undefined;
	/** The conference sends it on its own. */
	automatic: boolean;
	/** How the last try went, and when; `null` if it was never sent. */
	lastStatus: EmailStatus | null;
	lastAt: Date | null;
}

interface LogRow {
	kind: EmailKind;
	subjectKey: string;
	status: EmailStatus;
	createdAt: Date;
	sentAt: Date | null;
}

/** Pairs each mail owed to `userId` with the latest log row about it. */
export function personEmailsOf({
	due,
	userId,
	enabled,
	logs
}: {
	due: readonly DueEmail[];
	userId: string;
	enabled: ReadonlySet<EmailKind>;
	logs: readonly LogRow[];
}): PersonEmail[] {
	const latest = (email: DueEmail) =>
		logs
			.filter((log) => log.kind === email.kind && log.subjectKey === email.subjectKey)
			.reduce<LogRow | undefined>(
				(last, log) => (!last || log.createdAt > last.createdAt ? log : last),
				undefined
			);
	return due
		.filter((email) => email.recipient.id === userId)
		.map((email) => {
			const last = latest(email);
			return {
				kind: email.kind,
				subjectKey: email.subjectKey,
				detail: emailDetail(email),
				automatic: enabled.has(email.kind),
				lastStatus: last?.status ?? null,
				lastAt: last ? (last.sentAt ?? last.createdAt) : null
			};
		});
}

/** What the conference owes, counting reminders any time before their date; none if it is gone. */
async function owedByHand({ conferenceId, now }: { conferenceId: string; now: Date }) {
	const snapshot = await loadEmailSnapshot(conferenceId);
	return snapshot
		? { snapshot, due: dueEmails({ snapshot, now, anyTimeBefore: true }) }
		: undefined;
}

export async function personEmails({
	conferenceId,
	userId,
	now = new Date()
}: {
	conferenceId: string;
	userId: string;
	now?: Date;
}) {
	const [owed, enabled, logs] = await Promise.all([
		owedByHand({ conferenceId, now }),
		enabledKinds(conferenceId),
		db.query.emailLog.findMany({
			where: { conferenceId, userId },
			columns: { kind: true, subjectKey: true, status: true, createdAt: true, sentAt: true }
		})
	]);
	return owed ? personEmailsOf({ due: owed.due, userId, enabled, logs }) : [];
}

/**
 * Sends a person one mail they are owed right now, however often it went out before. `undefined`
 * when they are not owed it (any more); else why it failed, `null` when it went out.
 */
export async function sendPersonEmail({
	conferenceId,
	userId,
	kind,
	subjectKey,
	sentById,
	origin
}: {
	conferenceId: string;
	userId: string;
	kind: EmailKind;
	subjectKey: string;
	sentById: string;
	origin: string;
}) {
	const owed = await owedByHand({ conferenceId, now: new Date() });
	const email = owed?.due.find(
		(due) => due.recipient.id === userId && due.kind === kind && due.subjectKey === subjectKey
	);
	if (!owed || !email) return undefined;
	const wording = await loadWording(conferenceId);
	const error = await sendByHand({
		conferenceId,
		kind,
		userId,
		subjectKey,
		to: email.recipient.email,
		sentById,
		render: () =>
			renderAutomaticEmail({ email, conference: owed.snapshot.conference, origin, wording })
	});
	return error ?? null;
}
