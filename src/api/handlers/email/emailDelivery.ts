import { db, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { emailService } from '#api/services/email/emailService';
import { localeOfUser, runWithLocale } from '#api/services/requestLocale';
import { getLocale, toLocale, type Locale } from '#lib/paraglide/runtime';
import { renderEmail, NotificationEmail } from '#api/services/email/templates/index';
import { emailLogPubsub } from '#api/pubsub';
import { whereRows } from '#api/db/whereRows';
import { emailFooterParagraphs } from './emailText';
import type { DueEmail, EmailKind, EmailSnapshot } from './dueEmails';
import { emailContent, recipientName, type ConferenceEmailText } from './emailContent';

/**
 * How every mail goes out, whether the sweep sends it or the team does by hand: in the recipient's
 * language and the conference's own words, with its log row written first and settled after.
 */

/** What the conference wrote itself: its texts, every kind and language, and its footers. */
export interface ConferenceWording {
	texts: readonly ConferenceEmailText[];
	footers: readonly { locale: string; text: string }[];
}

export async function loadWording(conferenceId: string): Promise<ConferenceWording> {
	const [texts, footers] = await Promise.all([
		db.query.conferenceEmailText.findMany({
			where: { conferenceId },
			columns: { kind: true, locale: true, subject: true, heading: true, body: true }
		}),
		db.query.conferenceEmailFooter.findMany({
			where: { conferenceId },
			columns: { locale: true, text: true }
		})
	]);
	return { texts, footers };
}

/** The conference's own text of `kind` and its footer, in `locale`. */
export function wordingIn({
	wording,
	kind,
	locale
}: {
	wording: ConferenceWording;
	kind: EmailKind;
	locale: Locale;
}) {
	return {
		own: wording.texts.find((text) => text.kind === kind && toLocale(text.locale) === locale),
		footer: wording.footers.find((footer) => toLocale(footer.locale) === locale)?.text
	};
}

export interface RenderedEmail {
	subject: string;
	html: string;
	text: string;
	replyTo?: string;
}

/** Renders one automatic mail in the recipient's language, in the conference's own words. */
export function renderAutomaticEmail({
	email,
	conference,
	origin,
	wording
}: {
	email: DueEmail;
	conference: EmailSnapshot['conference'];
	origin: string;
	wording: ConferenceWording;
}): Promise<RenderedEmail> {
	return runWithLocale({
		locale: localeOfUser(email.recipient.locale),
		fn: async () => {
			const content = emailContent({ email, conference, origin, texts: wording.texts });
			const { footer } = wordingIn({ wording, kind: email.kind, locale: getLocale() });
			const { html, text } = await renderEmail({
				component: NotificationEmail,
				props: {
					heading: content.heading,
					recipientName: recipientName(email.recipient),
					paragraphs: content.paragraphs,
					items: content.items,
					closing: content.closing,
					button: content.button,
					conferenceTitle: conference.title,
					conferenceFooter: emailFooterParagraphs({ footer, conferenceTitle: conference.title })
				}
			});
			return { subject: content.subject, html, text, replyTo: content.replyTo };
		}
	});
}

/** Why the mail service did not send a mail; `undefined` when it did. */
export function sendingError(result: { success: boolean; error?: string }) {
	return result.success ? undefined : (result.error ?? 'unknown error');
}

/** What the log says about something thrown while rendering or sending. */
export function errorText(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

/** Records how sending went: sent, or failed with why. */
async function settle({ logId, error }: { logId: string; error: string | undefined }) {
	await db
		.update(schema.emailLog)
		.set(
			error === undefined
				? { status: 'SENT', sentAt: new Date(), error: null }
				: { status: 'FAILED', error }
		)
		.where(whereRows({ table: schema.emailLog, filter: { id: logId } }));
	return error;
}

/**
 * Renders and sends one mail whose log row is written, and settles the row. Whatever goes wrong is
 * written there, never thrown: answers why it failed, `undefined` when it went out.
 */
export async function deliver({
	logId,
	to,
	render
}: {
	logId: string;
	to: string;
	render: () => Promise<RenderedEmail>;
}) {
	try {
		const { subject, html, text, replyTo } = await render();
		const result = await emailService.sendEmail({ to, subject, html, text, replyTo });
		return await settle({ logId, error: sendingError(result) });
	} catch (error) {
		return settle({ logId, error: errorText(error) });
	}
}

/**
 * Sends one mail the team sends by hand, as a log row of its own: it is sent however often it was
 * before. Answers why it failed, `undefined` when it went out.
 */
export async function sendByHand({
	conferenceId,
	kind,
	userId,
	subjectKey,
	to,
	sentById,
	render
}: {
	conferenceId: string;
	kind: EmailKind;
	/** None for a team invitation, which goes to an address. */
	userId: string | null;
	subjectKey: string;
	to: string;
	sentById: string;
	render: () => Promise<RenderedEmail>;
}) {
	const row = await db
		.insert(schema.emailLog)
		.values({
			conferenceId,
			kind,
			userId,
			subjectKey,
			trigger: 'MANUAL',
			sentById,
			status: 'SENDING',
			attempts: 1,
			email: to
		})
		.returning({ id: schema.emailLog.id })
		.then(assertFirstEntryExists);
	emailLogPubsub.created();
	const error = await deliver({ logId: row.id, to, render });
	emailLogPubsub.updated(row.id);
	return error;
}
