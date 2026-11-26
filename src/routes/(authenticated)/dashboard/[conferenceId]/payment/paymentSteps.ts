/** The steps of the payment page, in order. */
const STEPS = ['info', 'who', 'reference', 'hints', 'transfer', 'arrival'] as const;
export type PaymentStep = (typeof STEPS)[number];

/**
 * The steps that show: those done and the open one after them, like the postal registration
 * (`postalSteps`). Who a payment covers is only asked of somebody who may pay for others; once a
 * reference exists it is settled, and so is the choice before it. The last step, the money
 * arriving, is never done here: once it is, the page shows that the fee is paid instead.
 */
export function paymentSteps({
	read,
	canPayForOthers,
	whoConfirmed,
	hasReference,
	hintsSeen,
	transferReported
}: {
	read: boolean;
	canPayForOthers: boolean;
	whoConfirmed: boolean;
	hasReference: boolean;
	hintsSeen: boolean;
	transferReported: boolean;
}) {
	const done: Record<PaymentStep, boolean> = {
		info: read,
		who: whoConfirmed || hasReference,
		reference: hasReference,
		hints: hintsSeen,
		transfer: transferReported,
		arrival: false
	};
	const steps = STEPS.filter((step) => step !== 'who' || canPayForOthers);
	const open = steps.find((step) => !done[step]) ?? 'arrival';
	return {
		open,
		shown: steps
			.slice(0, steps.indexOf(open) + 1)
			.map((step, index) => ({ step, number: index + 1, done: step !== open }))
	};
}
