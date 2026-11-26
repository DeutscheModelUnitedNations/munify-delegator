import { client } from '#lib/api/rumbleClient/client';

const open = { recievedAt: { isNull: true }, discardedAt: { isNull: true } } as const;
const person = { givenName: true, familyName: true } as const;

/**
 * The caller's references in the conference that are still open (their money has not arrived and
 * they were not given up), newest first: the page works on the first, none while they made none.
 */
export function fetchMyOpenPayments({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId: string;
}) {
	return client.liveQuery.paymentTransactions({
		__args: {
			where: { conference: { id: { eq: conferenceId } }, user: { id: { eq: userId } }, ...open },
			orderBy: { createdAt: 'desc' },
			limit: 1
		},
		amount: true,
		createdAt: true,
		transferReportedAt: true,
		paymentFor: { user: person }
	});
}

/** Open references somebody else made that cover the caller. */
export function fetchPaymentsCoveringMe({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId: string;
}) {
	return client.liveQuery.paymentTransactions({
		__args: {
			where: {
				conference: { id: { eq: conferenceId } },
				paymentFor: { user: { id: { eq: userId } } },
				NOT: { user: { id: { eq: userId } } },
				...open
			},
			orderBy: { createdAt: 'desc' }
		},
		createdAt: true,
		transferReportedAt: true,
		user: person
	});
}
