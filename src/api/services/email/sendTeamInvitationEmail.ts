import { emailService } from './emailService';
import { renderEmail, TeamInvitationEmail, TeamWelcomeEmail } from '#lib/emails/index.js';
import type { TeamRole } from '$api/services/authHelper';
import { translateTeamRole } from '#lib/utils/enumTranslations.js';
import { m } from '#lib/paraglide/messages.js';
import type { Locale } from '#lib/paraglide/runtime.js';
import { runWithLocale } from '../requestLocale';
import type { SendEmailResult } from './types';

export interface SendTeamInvitationEmailParams {
	recipientEmail: string;
	conferenceTitle: string;
	role: TeamRole;
	/** Absent when the inviter's account is gone. */
	inviterName?: string;
	inviteUrl: string;
	expiresAt: Date;
	/** The language of the mail. */
	locale: Locale;
}

/**
 * Send an invitation email to a new user to join the team
 */
export function sendTeamInvitationEmail(
	params: SendTeamInvitationEmailParams
): Promise<SendEmailResult> {
	const { recipientEmail, conferenceTitle, role, inviterName, inviteUrl, expiresAt, locale } =
		params;

	return runWithLocale(locale, async () => {
		const formattedExpiresAt = new Intl.DateTimeFormat(locale, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: 'Europe/Berlin'
		}).format(expiresAt);

		const { html, text } = await renderEmail(TeamInvitationEmail, {
			recipientEmail,
			conferenceTitle,
			roleName: translateTeamRole(role),
			inviterName: inviterName ?? m.emailTeamInvitationUnknownInviter(),
			inviteUrl,
			expiresAt: formattedExpiresAt
		});

		return emailService.sendEmail({
			to: recipientEmail,
			subject: m.emailTeamInvitationSubject({ conferenceTitle }),
			html,
			text
		});
	});
}

export interface SendTeamWelcomeEmailParams {
	recipientName: string;
	recipientEmail: string;
	conferenceTitle: string;
	role: TeamRole;
	/** Absent when the inviter's account is gone. */
	inviterName?: string;
	dashboardUrl: string;
	/** The language of the mail: the one the recipient uses. */
	locale: Locale;
}

/**
 * Send a welcome email to an existing user who was added to the team
 */
export function sendTeamWelcomeEmail(params: SendTeamWelcomeEmailParams): Promise<SendEmailResult> {
	const { recipientEmail, locale, ...templateProps } = params;

	return runWithLocale(locale, async () => {
		const { role, inviterName, ...rest } = templateProps;
		const { html, text } = await renderEmail(TeamWelcomeEmail, {
			recipientEmail,
			...rest,
			roleName: translateTeamRole(role),
			inviterName: inviterName ?? m.emailTeamInvitationUnknownInviter()
		});

		return emailService.sendEmail({
			to: recipientEmail,
			subject: m.emailTeamWelcomeSubject({ conferenceTitle: params.conferenceTitle }),
			html,
			text
		});
	});
}
