import { m } from '#lib/paraglide/messages';
import type { NotificationChannel } from '#lib/helpers/teamNotifications';

/**
 * What the page says after a test notification: `result` is `sendNotificationTest`'s answer, or
 * undefined when the request failed.
 */
export function notificationTestToast({
	channel,
	result
}: {
	channel: NotificationChannel;
	result: string | undefined;
}): { success: boolean; message: string } {
	if (result === 'SENT') {
		return {
			success: true,
			message: channel === 'EMAIL' ? m.notificationTestEmailSent() : m.slackTestSent()
		};
	}
	if (channel === 'EMAIL') return { success: false, message: m.notificationTestEmailFailed() };
	return {
		success: false,
		message: result === 'NOT_FOUND' ? m.slackNotFoundShort() : m.slackUnavailable()
	};
}
