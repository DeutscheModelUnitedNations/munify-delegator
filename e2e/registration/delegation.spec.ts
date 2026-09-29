import { test, expect } from '@playwright/test';
import { loginAs, makeTestUser } from '../support/auth';
import { openFirstConferenceForRegistration } from '../support/registration';

test('a head delegate can create a delegation and a second user can join it with the entry code', async ({
	browser
}) => {
	const headDelegateContext = await browser.newContext();
	const headDelegatePage = await headDelegateContext.newPage();

	const headDelegate = makeTestUser('head-delegate');
	await loginAs(headDelegatePage, headDelegate, { startUrl: '/registration' });

	const conferenceId = await openFirstConferenceForRegistration(headDelegatePage);

	await headDelegatePage.locator('a[href$="/create-delegation"]').click();
	await headDelegatePage.waitForURL(/\/create-delegation$/);

	// step 0: informational step. Retry the click: a click just after client-side navigation
	// can land before hydration attaches the handler.
	const schoolInput = headDelegatePage.locator('input[name="school"]');
	await expect(async () => {
		await headDelegatePage.getByRole('button', { name: /weiter|next/i }).click();
		await expect(schoolInput).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 15_000 });

	// step 1: questionnaire
	await schoolInput.fill('E2E Test School');
	await headDelegatePage.locator('textarea[name="motivation"]').fill('We want to join.');
	await headDelegatePage.locator('textarea[name="experience"]').fill('Some experience.');
	await headDelegatePage.locator('form button.btn-primary').first().click();

	// step 2: entry code is shown
	const entryCodeLocator = headDelegatePage.locator('p.font-mono');
	await expect(entryCodeLocator).toBeVisible({ timeout: 15_000 });
	const entryCode = (await entryCodeLocator.textContent())?.trim();
	expect(entryCode).toBeTruthy();

	await headDelegateContext.close();

	// --- second user joins the delegation using the entry code ---
	const memberContext = await browser.newContext();
	const memberPage = await memberContext.newPage();

	const member = makeTestUser('delegation-member');
	await loginAs(memberPage, member, {
		startUrl: `/registration/${conferenceId}/join-delegation`
	});

	if (!memberPage.url().includes('/join-delegation')) {
		await memberPage.goto(`/registration/${conferenceId}/join-delegation`);
	}

	await memberPage.locator('input[placeholder="Code"]').fill(entryCode!);
	await expect(memberPage.getByRole('button', { name: /bestätigen|confirm/i })).toBeVisible({
		timeout: 15_000
	});
	await memberPage.getByRole('button', { name: /bestätigen|confirm/i }).click();

	await memberPage.waitForURL(new RegExp(`/dashboard/${conferenceId}$`));
	await expect(memberPage).toHaveURL(new RegExp(`/dashboard/${conferenceId}$`));

	await memberContext.close();
});
