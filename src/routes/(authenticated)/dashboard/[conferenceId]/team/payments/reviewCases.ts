/**
 * The payments page's review cases: the payments the bank payment sync (or a person) flagged
 * `NEEDS_HUMAN_REVIEW`, grouped by the transfer that flagged them, with what deciding them writes.
 */

type BankTransferResult = 'RECEIVED' | 'AMOUNT_MISMATCH' | 'ALREADY_RECEIVED';

export interface CaseTransfer {
	externalId: number;
	amount: number;
	bookedAt: Date | string;
	result: BankTransferResult;
	counterparty?: string | null;
	purpose?: string | null;
}

export interface CasePayment {
	id: string;
	amount: number;
	paymentFor: readonly {
		conferenceParticipantId: string;
		participant: { paymentStatus: string };
	}[];
	bankTransfers: readonly CaseTransfer[];
}

/** A payment as the payments page shows it in a case: with its payer and the people's names. */
export interface ReviewPayment extends CasePayment {
	payerParticipantId: string;
	recievedAt?: Date | string | null;
	paymentFor: readonly {
		conferenceParticipantId: string;
		participant: { paymentStatus: string };
		user: { id: string; givenName?: string | null; familyName?: string | null };
	}[];
}

/**
 * - `tooLow` / `tooHigh`: the transfer brought less or more than the payments it names together.
 * - `alreadyReceived`: a payment it names had been settled before: paid twice?
 * - `flagged`: no transfer explains it (set by hand, or the amounts fit after all).
 */
export type ReviewKind = 'tooLow' | 'tooHigh' | 'alreadyReceived' | 'flagged';

export interface ReviewCase<P extends CasePayment> {
	/** The transfer's id, or the payment's for a case without one. */
	key: string;
	kind: ReviewKind;
	payments: P[];
	/** The transfer that flagged the payments, if any. */
	transfer?: CaseTransfer;
	/** What the payments of the case ask for together. */
	expected: number;
}

const time = (date: Date | string) => new Date(date).getTime();

/** Amounts closer than half a cent are the same, as the sync decides. */
const sameAmount = (a: number, b: number) => Math.abs(a - b) < 0.005;

const inReview = (payment: CasePayment) =>
	payment.paymentFor.some(({ participant }) => participant.paymentStatus === 'NEEDS_HUMAN_REVIEW');

/** The newest transfer that did not settle the payment: what put it up for review. */
export function flaggingTransfer(payment: CasePayment): CaseTransfer | undefined {
	return payment.bankTransfers
		.filter((transfer) => transfer.result !== 'RECEIVED')
		.toSorted((a, b) => time(b.bookedAt) - time(a.bookedAt) || b.externalId - a.externalId)[0];
}

function kindOf({
	transfer,
	payments,
	expected
}: {
	transfer: CaseTransfer | undefined;
	payments: readonly CasePayment[];
	expected: number;
}): ReviewKind {
	if (!transfer) return 'flagged';
	const paidTwice = payments.some((payment) =>
		payment.bankTransfers.some(
			(t) => t.externalId === transfer.externalId && t.result === 'ALREADY_RECEIVED'
		)
	);
	if (paidTwice) return 'alreadyReceived';
	if (sameAmount(transfer.amount, expected)) return 'flagged';
	return transfer.amount < expected ? 'tooLow' : 'tooHigh';
}

/**
 * The review cases of these payments: one per transfer that flagged them (a transfer naming two
 * references is one case), one per payment flagged without a transfer. Oldest transfer first, so
 * the page works through them in the order the money came in; cases without one last.
 */
export function reviewCases<P extends CasePayment>(payments: readonly P[]): ReviewCase<P>[] {
	const groups = new Map<string, { transfer?: CaseTransfer; payments: P[] }>();
	for (const payment of payments.filter(inReview)) {
		const transfer = flaggingTransfer(payment);
		const key = transfer ? `transfer:${transfer.externalId}` : `payment:${payment.id}`;
		const group = groups.get(key) ?? { transfer, payments: [] };
		group.payments.push(payment);
		groups.set(key, group);
	}
	return [...groups.entries()]
		.map(([key, group]) => {
			const expected = group.payments.reduce((sum, payment) => sum + payment.amount, 0);
			return {
				key,
				kind: kindOf({ transfer: group.transfer, payments: group.payments, expected }),
				payments: group.payments,
				transfer: group.transfer,
				expected
			};
		})
		.toSorted((a, b) => {
			if (!a.transfer || !b.transfer) return a.transfer ? -1 : b.transfer ? 1 : 0;
			return time(a.transfer.bookedAt) - time(b.transfer.bookedAt);
		});
}

/**
 * Whom a case starts with ticked as paid: for a transfer that brought too little as many people,
 * in order, as its amount pays for at the payments' fee; nobody for a payment paid twice (nothing
 * to tick there); everybody otherwise.
 */
export function preselected(reviewCase: ReviewCase<CasePayment>): string[] {
	const people = reviewCase.payments.flatMap((payment) =>
		payment.paymentFor.map((p) => p.conferenceParticipantId)
	);
	if (reviewCase.kind === 'alreadyReceived') return [];
	if (reviewCase.kind !== 'tooLow' || !reviewCase.transfer) return people;
	const fee = reviewCase.expected / Math.max(people.length, 1);
	const paidFor = fee > 0 ? Math.floor(reviewCase.transfer.amount / fee + 0.005) : 0;
	return people.slice(0, Math.min(paidFor, people.length));
}

/** What marking the ticked people paid writes, per payment of the case. */
export type PaymentDecision =
	| { paymentId: string; kind: 'received' }
	| { paymentId: string; kind: 'partly'; paidFor: string[] }
	| { paymentId: string; kind: 'pending' };

/**
 * Marking `paid` (participant row ids) as paid: a payment whose people are all ticked is received,
 * one with some ticked settles those (`receivePaymentFor`), one with nobody ticked goes back to
 * pending, to be paid anew.
 */
export function paidDecisions({
	payments,
	paid
}: {
	payments: readonly CasePayment[];
	paid: readonly string[];
}): PaymentDecision[] {
	const ticked = new Set(paid);
	return payments.map((payment) => {
		const people = payment.paymentFor.map((p) => p.conferenceParticipantId);
		const paidFor = people.filter((id) => ticked.has(id));
		if (paidFor.length === people.length && people.length > 0)
			return { paymentId: payment.id, kind: 'received' };
		if (paidFor.length > 0) return { paymentId: payment.id, kind: 'partly', paidFor };
		return { paymentId: payment.id, kind: 'pending' };
	});
}
