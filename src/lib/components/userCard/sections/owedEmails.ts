import type { EmailkindEnum, EmailstatusEnum } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import { getLocale } from '#lib/paraglide/runtime';
import { emailKindTexts, emailStatusLabel } from '#lib/helpers/emailKindTexts';

/** A mail the person is owed, as the user card lists it. */
export interface OwedEmail {
	kind: EmailkindEnum;
	subjectKey: string;
	detail: string | null;
	automatic: boolean;
	lastStatus: EmailstatusEnum | null;
	lastAt: Date | null;
}

export const owedEmailKey = (email: OwedEmail) => `${email.kind}:${email.subjectKey}`;

/** The kind, and what tells it apart from the person's other mails of that kind. */
export const owedEmailTitle = (email: OwedEmail) =>
	email.detail
		? `${emailKindTexts(email.kind).title}: ${email.detail}`
		: emailKindTexts(email.kind).title;

/** Whether the conference sends it on its own, and how the last try went. */
export function owedEmailState(email: OwedEmail) {
	const source = email.automatic ? m.emailOwedAutomatic() : m.emailOwedByHandOnly();
	const last =
		email.lastStatus && email.lastAt
			? `${emailStatusLabel[email.lastStatus]()} ${email.lastAt.toLocaleString(getLocale(), {
					dateStyle: 'short',
					timeStyle: 'short'
				})}`
			: m.emailOwedNeverSent();
	return `${source} · ${last}`;
}

export const wasSent = (email: OwedEmail) => email.lastStatus === 'SENT';

/** Passes a send that went out; throws why the mail service refused one. */
export function ensureSent(result: { sent: boolean; error: string | null }) {
	if (!result.sent) throw new Error(m.emailSendFailed({ error: result.error ?? '' }));
}
