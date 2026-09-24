import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_SUPERVISOR_FOR_CONNECT_USER_ID } from '../seed/seed';

// Covers the supervisor's "group payment" variant - selecting multiple supervised participants
// (plus themselves) and generating one shared reference. Distinct participant-selection logic
// from the "single" variant already covered in payment.spec.ts.
test('a supervisor can generate a group payment reference covering themselves and a supervised participant', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_SUPERVISOR_FOR_CONNECT_USER_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/payment/group`
	});

	const feeRes = await page.request.post('/api/graphql', {
		data: {
			query: `query { findUniqueConference(where: { id: "${E2E_CONFERENCE_ID}" }) { feeAmount } }`
		}
	});
	const feeAmount = (await feeRes.json())?.data?.findUniqueConference?.feeAmount as number;
	expect(feeAmount).toBeGreaterThan(0);

	// The page auto-selects the supervisor + all supervised participants on mount - wait for
	// that default selection instead of driving the multi-select UI by hand.
	const generateButton = page.locator('button:has(.fa-sparkles)');
	await expect(generateButton).toBeEnabled({ timeout: 15_000 });
	await generateButton.click();

	const readonlyInputs = page.locator('input[readonly]');
	await expect(readonlyInputs.last()).toHaveValue(/.+/, { timeout: 15_000 });
	const amountText = await readonlyInputs.nth(4).inputValue();
	// >=2x rather than exactly 2x: this supervisor's supervised-participant count can grow if
	// connect-supervisor.spec.ts's own dynamic connection happened to run earlier in the suite
	// (same supervisor fixture) - the point here is proving multi-person selection worked at all.
	expect(parseFloat(amountText)).toBeGreaterThanOrEqual(feeAmount * 2 - 0.01);
});
