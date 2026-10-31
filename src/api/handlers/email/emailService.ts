import { db, schema } from '#api/db/db';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { toLocale, type Locale } from '#lib/paraglide/runtime';
import { isAlwaysSent } from '#lib/helpers/emailKinds';
import { assertFindFirstExists } from '@m1212e/rumble';
import { z } from 'zod';
import type { EmailKind } from './dueEmails';
import type { EmailTextOverride } from './emailText';
import { countOpenEmails, sendOpenEmailsInBackground, skipOpenEmails } from './emailSweep';
import { setEmailKindsEnabled } from './emailSettings';
import { previewEmail } from './emailPreview';
import { sendPersonEmail } from './personEmails';
import { sendBadgeFoundEmail } from './badgeFoundEmail';

/**
 * What the email resolvers call. The work itself lives in focused modules beside it, which the
 * job route and the other handlers use directly:
 *
 * - `dueEmails.ts`: which mails a conference owes, pure; `emailSnapshot.ts` loads what it decides on
 * - `emailSweep.ts`: sending what is owed and unsent (the team's "send now", the `send-emails` job)
 * - `emailSettings.ts`: the switches, texts and footers a conference keeps
 * - `emailPreview.ts`: a mail as it would look, for the text editor
 * - `personEmails.ts`: one person's mails, sent by hand from the user card
 * - `badgeFoundEmail.ts`, `teamInvitationEmail.ts`: the mails sent where they happen
 * - `emailDelivery.ts`, `emailContent.ts`, `emailText.ts`, `templates/`, `mailTransport.ts`: rendering
 *   and sending one mail
 */

export { personEmails } from './personEmails';
export { setEmailFooter, setEmailText } from './emailSettings';

/** A language the app speaks; anything else is refused. */
export const localeSchema = z.string().transform((value, ctx) => {
	const locale = toLocale(value);
	if (locale) return locale;
	ctx.issues.push({ code: 'custom', input: value, message: m.emailTextUnknownLanguage() });
	return z.NEVER;
});

/** A text the team writes for its mails, at most `max` characters long. */
function emailTextSchema(max: number) {
	return z.string().max(max, { error: () => m.emailTextTooLong({ max }) });
}

/** A mail's subject or heading: one line. */
export const emailLineSchema = emailTextSchema(200);

/** A mail's body or footer: a few paragraphs, generously. */
export const emailParagraphsSchema = emailTextSchema(10_000);

/** A language the app speaks, or none (empty or left out). */
export const optionalLocaleSchema = z
	.union([z.literal('').transform(() => undefined), localeSchema])
	.nullish();

/** Refuses (INVALID_INPUT) the kinds the conference cannot switch: the ones always sent. */
export const switchableKindSchema = z
	.object({ kind: z.string() })
	.refine(({ kind }) => !isAlwaysSent(kind), { error: () => m.emailKindAlwaysSent() });

/** The kinds among `kinds` (else all) that follow from state; the team invitation never does. */
const owedKinds = (kinds?: readonly EmailKind[] | null) =>
	(kinds ?? schema.emailKind.enumValues).filter((kind) => !isAlwaysSent(kind));

/** How many mails of each of `kinds` (else every kind) the conference owes and has not sent. */
export function openEmailCounts({
	conferenceId,
	kinds
}: {
	conferenceId: string;
	kinds?: readonly EmailKind[] | null;
}) {
	return countOpenEmails({ conferenceId, kinds: owedKinds(kinds) });
}

/**
 * Starts sending everything of `kinds` the conference owes, switched on or not, in the background.
 * Answers how many mails that is.
 */
export async function sendOpenEmails({
	conferenceId,
	kinds: chosen,
	origin
}: {
	conferenceId: string;
	kinds: readonly EmailKind[];
	origin: string;
}) {
	const kinds = owedKinds(chosen);
	const counts = await countOpenEmails({ conferenceId, kinds });
	sendOpenEmailsInBackground({ conferenceId, kinds, origin });
	return counts.reduce((sum, count) => sum + count.open, 0);
}

/** Marks everything of `kinds` the conference owes as skipped. Answers how many mails that was. */
export function skipEmails({
	conferenceId,
	kinds
}: {
	conferenceId: string;
	kinds: readonly EmailKind[];
}) {
	return skipOpenEmails({ conferenceId, kinds: owedKinds(kinds) });
}

/**
 * Switches the automatic sending of `kind` on or off. Switching it on with `notifyExisting: false`
 * first marks everybody it would reach right now as skipped.
 */
export async function switchEmailKind({
	conferenceId,
	kind,
	enabled,
	notifyExisting
}: {
	conferenceId: string;
	kind: EmailKind;
	enabled: boolean;
	notifyExisting?: boolean | null;
}) {
	if (enabled && notifyExisting === false) {
		await skipOpenEmails({ conferenceId, kinds: [kind] });
	}
	await setEmailKindsEnabled({ conferenceId, kinds: [kind], enabled });
}

/** Sent, failed and skipped mails per kind, after the conference's log. */
export async function emailStats(conferenceId: string) {
	const rows = await db.query.emailLog.findMany({
		where: { conferenceId },
		columns: { kind: true, status: true }
	});
	return schema.emailKind.enumValues.map((kind) => {
		const of = rows.filter((row) => row.kind === kind);
		return {
			kind,
			sent: of.filter((row) => row.status === 'SENT').length,
			failed: of.filter((row) => row.status === 'FAILED').length,
			skipped: of.filter((row) => row.status === 'SKIPPED').length
		};
	});
}

/**
 * A mail of `kind` as the conference would send it, addressed to `callerId` with made-up details,
 * in `locale` (else theirs). NOT_FOUND when the conference is gone.
 */
export async function previewEmailFor({
	conferenceId,
	callerId,
	kind,
	locale,
	origin,
	draft,
	footerDraft
}: {
	conferenceId: string;
	callerId: string;
	kind: EmailKind;
	locale: Locale | undefined;
	origin: string;
	draft?: EmailTextOverride;
	footerDraft?: string;
}) {
	const user = await db.query.user
		.findFirst({
			where: { id: callerId },
			columns: {
				id: true,
				email: true,
				givenName: true,
				familyName: true,
				locale: true,
				birthday: true
			}
		})
		.then(assertFindFirstExists);
	const preview = await previewEmail({
		conferenceId,
		kind,
		user: { ...user, locale: locale ?? user.locale },
		origin,
		draft,
		footerDraft
	});
	if (!preview) throw apiError({ code: 'NOT_FOUND', message: m.conferenceNotFound() });
	return { subject: preview.subject, html: preview.html };
}

/** What sending one mail by hand answers: whether it went out, else why the mail service refused. */
const sendingOutcome = (error: string | null) => ({ sent: error === null, error });

/**
 * Sends a person one mail they are owed right now, logged as sent by hand by `sentById`. Refuses
 * (CONFLICT) a mail they are not owed (any more).
 */
export async function sendOwedEmail(args: {
	conferenceId: string;
	userId: string;
	kind: EmailKind;
	subjectKey: string;
	sentById: string;
	origin: string;
}) {
	const error = await sendPersonEmail(args);
	if (error === undefined) throw apiError({ code: 'CONFLICT', message: m.emailSendNotOwed() });
	return sendingOutcome(error);
}

/**
 * Tells the person of participant row `participantId` that their lost badge was handed in.
 * NOT_FOUND when the row is gone.
 */
export async function notifyBadgeFound({
	participantId,
	sentById
}: {
	participantId: string;
	sentById: string;
}) {
	const error = await sendBadgeFoundEmail({ participantId, sentById });
	if (error === undefined) throw apiError({ code: 'NOT_FOUND', message: m.notFound() });
	return sendingOutcome(error);
}
