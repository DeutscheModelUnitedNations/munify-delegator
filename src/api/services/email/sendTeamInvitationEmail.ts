import { db } from '#api/db/db.js';
import { emailService } from './emailService';
import { renderEmail, TeamInvitationEmail, TeamWelcomeEmail } from './templates/index.js';
import type { TeamRole } from '#api/services/authHelper.js';
import { translateTeamRole } from '#lib/utils/enumTranslations.js';
import { m } from '#lib/paraglide/messages.js';
import type { Locale } from '#lib/paraglide/runtime.js';
import type { AlwaysSentKind } from '#lib/helpers/emailKinds.js';
import {
	emailFooterParagraphs,
	fillEmailText,
	resolveEmailText,
	type EmailPlaceholderValues,
	type EmailTextOverride
} from '#lib/helpers/emailTemplates.js';
import { runWithLocale } from '../requestLocale';
import type { SendEmailResult } from './types';

/**
 * The mails the team's own actions send: an invitation into the team, and the welcome for someone
 * who already has an account. They always go out; their text is the conference's own where it
 * wrote one (`conference_email_text`), else the default, like the automatic mails.
 */

/** The conference's own text of a team mail in one language, and its footer there, if any. */
async function ownWording(conferenceId: string, kind: AlwaysSentKind, locale: Locale) {
	const [text, footer] = await Promise.all([
		db.query.conferenceEmailText.findFirst({
			where: { conferenceId, kind, locale },
			columns: { subject: true, heading: true, body: true }
		}),
		db.query.conferenceEmailFooter.findFirst({
			where: { conferenceId, locale },
			columns: { text: true }
		})
	]);
	return { text, footer: footer?.text };
}

/** Subject, heading and paragraphs of a team mail, filled in; call inside `runWithLocale`. */
function teamText(
	kind: AlwaysSentKind,
	locale: Locale,
	own: EmailTextOverride | null | undefined,
	values: EmailPlaceholderValues
) {
	const filled = fillEmailText(resolveEmailText(kind, locale, own), values);
	return {
		subject: filled.subject,
		heading: filled.heading,
		paragraphs: [...filled.paragraphs, ...filled.closing]
	};
}

const inviterOrSomeone = (inviterName: string | undefined) =>
	inviterName ?? m.emailTeamInvitationUnknownInviter();

export interface TeamInvitationEmailValues {
	recipientEmail: string;
	conferenceTitle: string;
	role: TeamRole;
	/** Absent when the inviter's account is gone. */
	inviterName?: string;
	inviteUrl: string;
	expiresAt: Date;
}

/** Renders an invitation in `locale`, in `own` words and with `footer` where given. */
export function renderTeamInvitationEmail(
	values: TeamInvitationEmailValues,
	locale: Locale,
	own?: EmailTextOverride | null,
	footer?: string | null
) {
	return runWithLocale(locale, async () => {
		const expiresAt = new Intl.DateTimeFormat(locale, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: 'Europe/Berlin'
		}).format(values.expiresAt);
		const text = teamText('TEAM_INVITATION', locale, own, {
			conference: values.conferenceTitle,
			role: translateTeamRole(values.role),
			inviter: inviterOrSomeone(values.inviterName),
			date: expiresAt
		});
		const { html, text: plain } = await renderEmail(TeamInvitationEmail, {
			recipientEmail: values.recipientEmail,
			conferenceTitle: values.conferenceTitle,
			heading: text.heading,
			paragraphs: text.paragraphs,
			inviteUrl: values.inviteUrl,
			conferenceFooter: emailFooterParagraphs(footer, values.conferenceTitle)
		});
		return { subject: text.subject, html, text: plain };
	});
}

export interface SendTeamInvitationEmailParams extends TeamInvitationEmailValues {
	conferenceId: string;
	/** The language of the mail. */
	locale: Locale;
}

/**
 * Send an invitation email to a new user to join the team
 */
export async function sendTeamInvitationEmail(
	params: SendTeamInvitationEmailParams
): Promise<SendEmailResult> {
	const own = await ownWording(params.conferenceId, 'TEAM_INVITATION', params.locale);
	const { subject, html, text } = await renderTeamInvitationEmail(
		params,
		params.locale,
		own.text,
		own.footer
	);
	return emailService.sendEmail({ to: params.recipientEmail, subject, html, text });
}

export interface TeamWelcomeEmailValues {
	recipientName: string;
	recipientEmail: string;
	conferenceTitle: string;
	role: TeamRole;
	/** Absent when the inviter's account is gone. */
	inviterName?: string;
	dashboardUrl: string;
}

/** Renders a welcome in `locale`, in `own` words and with `footer` where given. */
export function renderTeamWelcomeEmail(
	values: TeamWelcomeEmailValues,
	locale: Locale,
	own?: EmailTextOverride | null,
	footer?: string | null
) {
	return runWithLocale(locale, async () => {
		const text = teamText('TEAM_WELCOME', locale, own, {
			name: values.recipientName,
			conference: values.conferenceTitle,
			role: translateTeamRole(values.role),
			inviter: inviterOrSomeone(values.inviterName)
		});
		const { html, text: plain } = await renderEmail(TeamWelcomeEmail, {
			recipientName: values.recipientName,
			recipientEmail: values.recipientEmail,
			conferenceTitle: values.conferenceTitle,
			heading: text.heading,
			paragraphs: text.paragraphs,
			dashboardUrl: values.dashboardUrl,
			conferenceFooter: emailFooterParagraphs(footer, values.conferenceTitle)
		});
		return { subject: text.subject, html, text: plain };
	});
}

export interface SendTeamWelcomeEmailParams extends TeamWelcomeEmailValues {
	conferenceId: string;
	/** The language of the mail: the one the recipient uses. */
	locale: Locale;
}

/**
 * Send a welcome email to an existing user who was added to the team
 */
export async function sendTeamWelcomeEmail(
	params: SendTeamWelcomeEmailParams
): Promise<SendEmailResult> {
	const own = await ownWording(params.conferenceId, 'TEAM_WELCOME', params.locale);
	const { subject, html, text } = await renderTeamWelcomeEmail(
		params,
		params.locale,
		own.text,
		own.footer
	);
	return emailService.sendEmail({ to: params.recipientEmail, subject, html, text });
}
