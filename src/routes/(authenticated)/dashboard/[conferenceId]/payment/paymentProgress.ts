import { client } from '#lib/api/rumbleClient/client';
import { logger } from '#lib/logger';

/**
 * How far somebody is on their payment page. `recorded` says whether what they do from here on is
 * kept: not while impersonated, and not without a part in the conference. `guideSkippable`: they
 * watched the payment guide to its end before (or are not who it is about).
 */
export async function fetchPaymentProgress({
	userId,
	conferenceId
}: {
	userId: string;
	conferenceId: string;
}) {
	const [[participant], user, { isImpersonating }] = await Promise.all([
		client.query.conferenceParticipants({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
			paymentInfoRead: true
		}),
		client.query.user({ __args: { id: userId }, paymentGuideCompletedAt: true }),
		client.query.impersonationStatus({ isImpersonating: true })
	]);
	const guideCompleted = user.paymentGuideCompletedAt !== null;
	return {
		read: participant?.paymentInfoRead ?? false,
		guideCompleted,
		guideSkippable: guideCompleted || isImpersonating,
		recorded: participant !== undefined && !isImpersonating
	};
}

/** Keeps that they read what it is about. Failing, it is asked again another time. */
export async function savePaymentInfoRead(conferenceId: string): Promise<void> {
	try {
		await client.mutate.updatePaymentProgress({
			__args: { conferenceId, infoRead: true },
			paymentInfoRead: true
		});
	} catch (error) {
		logger.warn('Keeping the progress of the payment page failed', error);
	}
}

/** Keeps on the account that the payment guide was watched to its end. */
export async function completePaymentGuide(): Promise<void> {
	try {
		await client.mutate.completePaymentGuide({ paymentGuideCompletedAt: true });
	} catch (error) {
		logger.warn('Recording the payment guide as watched failed', error);
	}
}
