import { REMINDER_GAP_DAYS, REMINDER_KINDS } from '#lib/helpers/emailKinds';
import type { DueEmail } from './dueEmails';

/**
 * Keeps the reminders to one person apart (`docs/plans/chase-link.md`): a reminder waits while the
 * person got another automatic one within the last `REMINDER_GAP_DAYS`, and of several due at once
 * only the first goes out. A reminder whose window closes before the gap is over goes out on its
 * last day anyway, so none is lost. Mails that report something are never held back.
 */

const DAY = 24 * 60 * 60 * 1000;

export function spaceReminders({
	due,
	lastReminderAt,
	now
}: {
	/** The open mails, in the order they would be sent. */
	due: readonly DueEmail[];
	/** When each person (by user id) last got an automatic reminder. */
	lastReminderAt: ReadonlyMap<string, Date>;
	now: Date;
}): DueEmail[] {
	const last = new Map(lastReminderAt);
	return due.filter((email) => {
		if (!email.remindsOf) return true;
		const previous = last.get(email.recipient.id);
		const lastDay = email.remindsOf.getTime() - now.getTime() <= DAY;
		if (previous && now.getTime() - previous.getTime() < REMINDER_GAP_DAYS * DAY && !lastDay) {
			return false;
		}
		last.set(email.recipient.id, now);
		return true;
	});
}

/** A row of the e-mail log, as far as the spacing reads it. */
export interface ReminderLogRow {
	trigger: string;
	status: string;
	kind: string;
	userId: string | null;
	updatedAt: Date;
}

/** When each person last got an automatic reminder (or one is being sent), by user id. */
export function lastReminders(logs: readonly ReminderLogRow[]) {
	const last = new Map<string, Date>();
	for (const log of logs) {
		const counts =
			log.trigger === 'AUTOMATIC' &&
			(log.status === 'SENT' || log.status === 'SENDING') &&
			REMINDER_KINDS.some((kind) => kind === log.kind);
		if (!counts || !log.userId) continue;
		const previous = last.get(log.userId);
		if (!previous || previous < log.updatedAt) last.set(log.userId, log.updatedAt);
	}
	return last;
}
