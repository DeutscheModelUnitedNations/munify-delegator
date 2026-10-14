import { emailService } from './emailService';
import { renderEmail, NewReviewEmail } from '$lib/emails';
import { m } from '$lib/paraglide/messages';
import type { Locale } from '$lib/paraglide/runtime';
import { translatePaperStatus, translatePaperType } from '$lib/utils/enumTranslations';
import type { PapertypeEnum, PaperstatusEnum } from '$lib/api/rumbleClient/client';
import { runWithLocale } from '../requestLocale';
import type { NewReviewEmailProps, SendEmailResult } from './types';

interface SendNewReviewNotificationParams extends Omit<
	NewReviewEmailProps,
	'paperType' | 'newStatus'
> {
	recipientEmail: string;
	/** The language of the mail: the one the author uses. */
	locale: Locale;
	paperType: PapertypeEnum;
	newStatus: PaperstatusEnum;
}

/**
 * Send a notification email to a paper author about a new review
 *
 * @param params - Parameters including recipient email and template props
 * @returns Result indicating success or failure
 */
export function sendNewReviewNotification(
	params: SendNewReviewNotificationParams
): Promise<SendEmailResult> {
	const { recipientEmail, locale, ...templateProps } = params;

	return runWithLocale(locale, async () => {
		const { html, text } = await renderEmail(NewReviewEmail, {
			...templateProps,
			paperType: translatePaperType(params.paperType),
			newStatus: translatePaperStatus(params.newStatus)
		});

		return emailService.sendEmail({
			to: recipientEmail,
			subject: m.emailNewReviewSubject({ paperTitle: params.paperTitle }),
			html,
			text,
			replyTo: params.reviewerEmail
		});
	});
}
