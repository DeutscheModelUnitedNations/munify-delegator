import { graphql } from '$houdini';

export const userPaymentTransactionsQuery = graphql(`
	query UserPaymentTransactions($userId: String!, $conferenceId: String!) {
		findManyPaymentTransactions(
			where: {
				conferenceId: { equals: $conferenceId }
				paymentFor: { some: { userId: { equals: $userId } } }
			}
			orderBy: [{ createdAt: desc }]
		) {
			id
			amount
			recievedAt
			conference {
				currency
			}
		}
	}
`);
