import { emailService } from './emailService';
import { renderEmail, TeamInvitationEmail, TeamWelcomeEmail } from '$lib/emails';
import type { SendEmailResult } from './types';

export interface SendTeamInvitationEmailParams {
	recipientEmail: string;
	conferenceTitle: string;
	roleName: string;
	inviterName: string;
	inviteUrl: string;
	expiresAt: Date;
}

/**
 * Send an invitation email to a new user to join the team
 */
export async function sendTeamInvitationEmail(
	params: SendTeamInvitationEmailParams
): Promise<SendEmailResult> {
	const { recipientEmail, conferenceTitle, roleName, inviterName, inviteUrl, expiresAt } = params;

	const formattedExpiresAt = expiresAt.toLocaleDateString('de-DE', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	const { html, text } = await renderEmail(TeamInvitationEmail, {
		recipientEmail,
		conferenceTitle,
		roleName,
		inviterName,
		inviteUrl,
		expiresAt: formattedExpiresAt
	});

	return emailService.sendEmail({
		to: recipientEmail,
		subject: `Einladung ins Organisationsteam: ${conferenceTitle}`,
		html,
		text
	});
}

export interface SendTeamWelcomeEmailParams {
	recipientName: string;
	recipientEmail: string;
	conferenceTitle: string;
	roleName: string;
	inviterName: string;
	dashboardUrl: string;
}

/**
 * Send a welcome email to an existing user who was added to the team
 */
export async function sendTeamWelcomeEmail(
	params: SendTeamWelcomeEmailParams
): Promise<SendEmailResult> {
	const { recipientEmail, ...templateProps } = params;

	const { html, text } = await renderEmail(TeamWelcomeEmail, {
		recipientEmail,
		...templateProps
	});

	return emailService.sendEmail({
		to: recipientEmail,
		subject: `Willkommen im Organisationsteam: ${params.conferenceTitle}`,
		html,
		text
	});
}
