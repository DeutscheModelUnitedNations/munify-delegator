import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_BANK_CARE_ID,
	E2E_BANK_CONFERENCE_ID,
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
		page.getByRole('button', { name: /als erhalten markieren|mark as received/i })
	).toBeVisible();

	const res = await page.request.post('/api/graphql', { data: bankTransfersQuery });
	const body = await res.json();
	expect(body.errors).toBeUndefined();
	expect(body.data.bankTransfers).toEqual([{ amount: 42.5, result: 'AMOUNT_MISMATCH' }]);
});

test('the payer reads no bank transfers, not even those of their own payment', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_BANK_PAYER_ID));

	const res = await page.request.post('/api/graphql', { data: bankTransfersQuery });
	const body = await res.json();
	expect(body.errors).toBeUndefined();
	expect(body.data.bankTransfers).toEqual([]);
});
