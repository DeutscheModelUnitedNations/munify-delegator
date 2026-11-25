import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_FEATURES_CONFERENCE_ID, E2E_FEATURES_PM_ID } from '../seed/featureRequirements';

// A feature switch needs what it works with: payments the fee and the bank account, and so on
// (`#lib/helpers/conferenceFeatures`). The settings cards keep such a switch off, and the API
// refuses it too, so no other client switches payments on without an IBAN.

type Result = {
	data?: { updateConference?: { unlockPayments: boolean } | null } | null;
	errors?: { message: string; extensions?: { code?: string } }[];
};

async function update(page: Page, args: Record<string, unknown>): Promise<Result> {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: {
			query: `mutation ($id: ID!, $on: Boolean, $fee: Float, $currency: String, $holder: String, $iban: String) {
				updateConference(
					id: $id, unlockPayments: $on, feeAmount: $fee, currency: $currency,
					bankAccountHolder: $holder, iban: $iban
				) { unlockPayments }
			}`,
			variables: { id: E2E_FEATURES_CONFERENCE_ID, ...args }
		}
	});
	return res.json();
}

const bankDetails = {
	fee: 75,
	currency: 'EUR',
	holder: 'DMUN e.V.',
	iban: 'DE89370400440532013000'
};

test.beforeEach(async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_FEATURES_PM_ID), {
		startUrl: `/dashboard/${E2E_FEATURES_CONFERENCE_ID}/team/configuration?tab=status`
	});
	await waitForHydration(page);
});

test('the payments card stays off until the bank details are filled in', async ({ page }) => {
	const payments = page.locator('input[name="unlockPayments"]');
	await expect(payments).toBeDisabled({ timeout: 15_000 });
	await expect(
		page.getByText(
			/braucht noch: Teilnahmebeitrag, Währung|still needs: participation fee, currency/i
		)
	).toBeVisible();
	// Messaging needs nothing
	await expect(page.locator('input[name="messagingEnabled"]')).toBeEnabled();

	await page.getByRole('tab', { name: /überweisungsinfo|banking/i }).click();
	await page.locator('input[name="feeAmount"]').fill('75');
	await page.locator('input[name="currency"]').fill('EUR');
	await page.locator('input[name="bankAccountHolder"]').fill('DMUN e.V.');
	await page.locator('input[name="iban"]').fill(bankDetails.iban);

	await page.getByRole('tab', { name: /status/i }).click();
	await expect(payments).toBeEnabled();
});

test('the API refuses payments without bank details, and taking the IBAN away while on', async ({
	page
}) => {
	const refused = await update(page, { on: true });
	expect(refused.errors?.[0]?.extensions?.code, JSON.stringify(refused)).toBe('CONFLICT');
	expect(refused.errors?.[0]?.message).toMatch(/IBAN/);

	const together = await update(page, { on: true, ...bankDetails });
	expect(together.errors, JSON.stringify(together)).toBeUndefined();
	expect(together.data?.updateConference?.unlockPayments).toBe(true);

	const cleared = await update(page, { iban: null });
	expect(cleared.errors?.[0]?.extensions?.code, JSON.stringify(cleared)).toBe('CONFLICT');

	// Off always passes, and with it the IBAN may go
	const off = await update(page, { on: false, iban: null });
	expect(off.errors, JSON.stringify(off)).toBeUndefined();
});
