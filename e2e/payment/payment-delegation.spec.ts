import { test, expect } from '@playwright/test';
import { loginAs, makeTestUser, waitForHydration } from '../support/auth';
import { openFirstConferenceForRegistration } from '../support/registration';

// Covers the head delegate's "delegation payment" variant - a reference covering the whole
// delegation, distinct participant-selection logic from the "single" variant already covered in
// payment.spec.ts.
test('a head delegate can generate a delegation payment reference covering all members', async ({
	browser
}) => {
	const headContext = await browser.newContext();
	const headPage = await headContext.newPage();
	headPage.on('dialog', (dialog) => dialog.accept());

	const headDelegate = makeTestUser('payment-deleg-head');
	await loginAs(headPage, headDelegate, { startUrl: '/registration' });
	const conferenceId = await openFirstConferenceForRegistration(headPage);

	await headPage.locator('a[href$="/create-delegation"]').click();
	await headPage.waitForURL(/\/create-delegation$/);

	const schoolInput = headPage.locator('input[name="school"]');
	await expect(async () => {
		await headPage.getByRole('button', { name: /weiter|next/i }).click();
		await expect(schoolInput).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 15_000 });

	await schoolInput.fill('E2E Test School');
	await headPage.locator('textarea[name="motivation"]').fill('We want to join.');
	await headPage.locator('textarea[name="experience"]').fill('Some experience.');
	await headPage.locator('form button.btn-primary').first().click();

	const entryCodeLocator = headPage.locator('p.font-mono');
	await expect(entryCodeLocator).toBeVisible({ timeout: 15_000 });
	const entryCode = (await entryCodeLocator.textContent())?.trim();

	// --- a second member joins ---
	const memberContext = await browser.newContext();
	const memberPage = await memberContext.newPage();
	const member = makeTestUser('payment-deleg-member');
	await loginAs(memberPage, member, {
		startUrl: `/registration/${conferenceId}/join-delegation`
	});
	await memberPage.locator('input[placeholder="Code"]').fill(entryCode!);
	const confirmButton = memberPage.getByRole('button', { name: /bestätigen|confirm/i });
	await expect(confirmButton).toBeVisible({ timeout: 15_000 });
	await confirmButton.click();
	await memberPage.waitForURL(new RegExp(`/dashboard/${conferenceId}$`), { timeout: 15_000 });
	await memberContext.close();

	const feeRes = await headPage.request.post('/api/graphql', {
		data: {
			query: `query { findUniqueConference(where: { id: "${conferenceId}" }) { feeAmount } }`
		}
	});
	const feeAmount = (await feeRes.json())?.data?.findUniqueConference?.feeAmount as number;
	expect(feeAmount).toBeGreaterThan(0);

	await headPage.goto(`/dashboard/${conferenceId}/payment/delegation`);
	await waitForHydration(headPage);

	const generateButton = headPage.locator('button:has(.fa-sparkles)');
	await expect(generateButton).toBeEnabled({ timeout: 15_000 });
	await generateButton.click();

	const readonlyInputs = headPage.locator('input[readonly]');
	await expect(readonlyInputs.last()).toHaveValue(/.+/, { timeout: 15_000 });
	const amountText = await readonlyInputs.nth(4).inputValue();
	expect(parseFloat(amountText)).toBeCloseTo(feeAmount * 2, 1);
});
