/** How amounts and the payment deadline read on the payment page. */

/** An amount in the conference's currency, as the locale writes it (`375,00 €`). */
export function formatMoney({
	amount,
	currency,
	locale
}: {
	amount: number;
	currency: string;
	locale: string;
}) {
	try {
		return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
	} catch {
		// a currency code Intl does not know: the number and the code as they are
		return `${amount.toFixed(2)} ${currency}`;
	}
}

/** Whether the payment deadline lies ahead or has passed; `undefined` without one. */
export function paymentDeadlineState({
	deadline,
	now
}: {
	deadline: Date | null | undefined;
	now: Date;
}): 'open' | 'overdue' | undefined {
	if (!deadline) return undefined;
	return new Date(deadline).getTime() < now.getTime() ? 'overdue' : 'open';
}
