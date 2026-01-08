import { emailService } from './emailService';
import { renderEmail, NewReviewEmail } from '$lib/emails';
import type { NewReviewEmailProps, SendEmailResult } from './types';

interface SendNewReviewNotificationParams extends NewReviewEmailProps {
	recipientEmail: string;
}

/**
 * Send a notification email to a paper author about a new review
 *
 * @param params - Parameters including recipient email and template props
 * @returns Result indicating success or failure
 */
export async function sendNewReviewNotification(
	params: SendNewReviewNotificationParams
): Promise<SendEmailResult> {
	const { recipientEmail, ...templateProps } = params;

	const { html, text } = await renderEmail(NewReviewEmail, templateProps);

	return emailService.sendEmail({
		to: recipientEmail,
		subject: `Neues Review für "${params.paperTitle}"`,
		html,
		text,
		replyTo: params.reviewerEmail
	});
}
