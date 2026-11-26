import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_BANK_CARE_ID,
	E2E_BANK_CONFERENCE_ID,
	E2E_BANK_DECIDE_REFERENCE,
	E2E_BANK_PAYER_ID,
	E2E_BANK_REFERENCE
} from '../seed/bankTransfers';

const bankTransfersQuery = {
	query: `query { bankTransfers(where: { paymentTransactionId: { eq: "${E2E_BANK_REFERENCE}" } }) { amount result } }`
};

test('participant care sees the transfer the bank payment sync flagged on the payments page', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_BANK_CARE_ID), {
		startUrl: `/dashboard/${E2E_BANK_CONFERENCE_ID}/team/payments`
	});

	await page.getByPlaceholder(/referenzsuche|reference search/i).fill(E2E_BANK_REFERENCE);
	await page.keyboard.press('Enter');

	const transfers = page.locator('[data-tour="team.payments.bankTransfers"]');
	await expect(transfers).toBeVisible({ timeout: 15_000 });
	await expect(
		transfers.getByRole('heading', { name: /banküberweisungen|bank transfers/i })
	).toBeVisible();
	await expect(transfers).toContainText(/betrag passt nicht|amount does not match/i);
	await expect(transfers).toContainText('4711');

	// the payment is still open, so it can be settled by hand once looked at
	await expect(
		page
			.locator('#reference-lookup')
			.getByRole('button', { name: /als erhalten markieren|mark as received/i })
	).toBeVisible();

	const res = await page.request.post('/api/graphql', { data: bankTransfersQuery });
	const body = await res.json();
	expect(body.errors).toBeUndefined();
	expect(body.data.bankTransfers).toEqual([{ amount: 42.5, result: 'AMOUNT_MISMATCH' }]);
});

test('participant care decides a review case: one of two people paid', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_BANK_CARE_ID), {
		startUrl: `/dashboard/${E2E_BANK_CONFERENCE_ID}/team/payments`
	});

	const reviewCase = page
		.getByTestId('payment-review-case')
		.filter({ hasText: E2E_BANK_DECIDE_REFERENCE });
	await expect(reviewCase).toBeVisible({ timeout: 15_000 });
	await expect(reviewCase).toContainText(/betrag zu niedrig|amount too low/i);
	await expect(reviewCase).toContainText('Förderverein E2E e. V.');
	// the transfer pays for one of the two, so one is ticked
	await expect(reviewCase.getByRole('checkbox', { checked: true })).toHaveCount(1);

	await reviewCase
		.getByRole('button', { name: /1 als erhalten markieren|mark 1 as received/i })
		.click();
	await expect(reviewCase).toHaveCount(0, { timeout: 15_000 });

	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query { paymentTransactions(where: { id: { eq: "${E2E_BANK_DECIDE_REFERENCE}" } }) { recievedAt paymentFor { participant { paymentStatus } } } }`
		}
	});
	const body = await res.json();
	expect(body.errors).toBeUndefined();
	const [payment] = body.data.paymentTransactions;
	// part of the money: the payment stays open, the other person pays anew
	expect(payment.recievedAt).toBeNull();
	expect(
		payment.paymentFor
			.map((p: { participant: { paymentStatus: string } }) => p.participant.paymentStatus)
			.sort()
	).toEqual(['DONE', 'PENDING']);
});

test('the payer reads no bank transfers, not even those of their own payment', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_BANK_PAYER_ID));

	const res = await page.request.post('/api/graphql', { data: bankTransfersQuery });
	const body = await res.json();
	expect(body.errors).toBeUndefined();
	expect(body.data.bankTransfers).toEqual([]);
});
