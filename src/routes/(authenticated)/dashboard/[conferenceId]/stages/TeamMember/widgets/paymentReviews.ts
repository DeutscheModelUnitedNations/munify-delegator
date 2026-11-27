import { client } from '#lib/api/rumbleClient/client';

/**
 * The conference's payments waiting for a person's decision (`NEEDS_HUMAN_REVIEW`), with what
 * `reviewCases` groups them by, live. The payments page lists the same cases; the overview's
 * widgets only count them.
 */
export function fetchPaymentsInReview(conferenceId: string) {
	return client.liveQuery.paymentTransactions({
		__args: {
			where: {
				conference: { id: { eq: conferenceId } },
				paymentFor: { participant: { paymentStatus: 'NEEDS_HUMAN_REVIEW' } }
			}
		},
		amount: true,
		paymentFor: { conferenceParticipantId: true, participant: { paymentStatus: true } },
		bankTransfers: { externalId: true, amount: true, bookedAt: true, result: true }
	});
}
