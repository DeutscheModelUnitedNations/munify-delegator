import { test, expect } from '@playwright/test';
import { loginAs, makeTestUser, waitForHydration } from '../support/auth';
import { openFirstConferenceForRegistration } from '../support/registration';

// Covers the delegation dashboard's member-management tools (rotating the entry code,
// transferring head delegate, removing a member) - all self-service, all only available before
// the delegation has applied, and none of it is exercised by the create/join-only registration
// tests.
test('a head delegate can rotate the entry code, remove a member, and transfer head delegate', async ({
	browser
}) => {
	const headContext = await browser.newContext();
	const headPage = await headContext.newPage();
	headPage.on('dialog', (dialog) => dialog.accept());

	const headDelegate = makeTestUser('member-mgmt-head');
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
	const originalEntryCode = (await entryCodeLocator.textContent())?.trim();

	await headPage.getByRole('link', { name: /zum dashboard|to dashboard/i }).click();
	await headPage.waitForURL(/\/dashboard(\/.+)?$/, { timeout: 15_000 });

	async function graphql(query: string) {
		const res = await headPage.request.post('/api/graphql', { data: { query } });
		return (await res.json())?.data;
	}

	// upsertSelf (src/api/resolvers/modules/user.ts) stores the OIDC *email* claim into the
	// User.preferred_username column - not the token's actual preferred_username claim - so look
	// users up by the email `makeTestUser` generated, not by `.preferred_username`. Also: the
	// `User` ability only lets a head delegate see users who currently share their delegation
	// (src/api/abilities/entities/user.ts), so a removed member becomes invisible to this lookup
	// afterwards - resolve ids while everyone is still a member, not after removing anyone.
	async function userIdFor(email: string) {
		const data = await graphql(
			`query { findManyUsers(where: { email: { equals: "${email}" } }) { id } }`
		);
		return data?.findManyUsers?.[0]?.id as string;
	}

	// --- two members join ---
	async function joinAs(prefix: string, code: string) {
		const context = await browser.newContext();
		const page = await context.newPage();
		const user = makeTestUser(prefix);
		await loginAs(page, user, { startUrl: `/registration/${conferenceId}/join-delegation` });
		await page.locator('input[placeholder="Code"]').fill(code);
		const confirmButton = page.getByRole('button', { name: /bestätigen|confirm/i });
		await expect(confirmButton).toBeVisible({ timeout: 15_000 });
		await confirmButton.click();
		await page.waitForURL(new RegExp(`/dashboard/${conferenceId}$`), { timeout: 15_000 });
		await context.close();
		return user;
	}

	const memberB = await joinAs('member-mgmt-b', originalEntryCode!);
	const memberC = await joinAs('member-mgmt-c', originalEntryCode!);

	await headPage.reload();
	await waitForHydration(headPage);

	const memberBUserId = await userIdFor(memberB.email);
	const memberCUserId = await userIdFor(memberC.email);
	expect(memberBUserId).toBeTruthy();
	expect(memberCUserId).toBeTruthy();

	// --- rotate the entry code ---
	const dashboardEntryCode = headPage.locator('p.font-mono');
	await expect(dashboardEntryCode).toHaveText(originalEntryCode!, { timeout: 15_000 });
	await headPage.getByRole('button', { name: 'Rotate entry code' }).click();
	await expect(dashboardEntryCode).not.toHaveText(originalEntryCode!, { timeout: 15_000 });

	// --- remove member C ---
	const memberCRow = headPage.locator('tr', { hasText: 'E2E member-mgmt-c' });
	await expect(memberCRow).toBeVisible({ timeout: 15_000 });
	await memberCRow.locator('button.btn-error').click();
	await expect(memberCRow).toBeHidden({ timeout: 15_000 });
	// let the removal's invalidateAll-triggered refetch/re-render fully settle before the next
	// confirm()-gated action - otherwise the next click can land mid-rerender.
	await waitForHydration(headPage);

	const memberCData = await graphql(
		`query { findUniqueDelegationMember(where: { conferenceId_userId: { conferenceId: "${conferenceId}", userId: "${memberCUserId}" } }) { id } }`
	);
	expect(memberCData?.findUniqueDelegationMember).toBeNull();

	// --- transfer head delegate to member B ---
	const memberBRow = headPage.locator('tr', { hasText: 'E2E member-mgmt-b' });

	async function isMemberBHeadDelegate() {
		const data = await graphql(
			`query { findUniqueDelegationMember(where: { conferenceId_userId: { conferenceId: "${conferenceId}", userId: "${memberBUserId}" } }) { isHeadDelegate } }`
		);
		return data?.findUniqueDelegationMember?.isHeadDelegate;
	}

	// Retry the click: this confirm()-gated action has been observed to occasionally not
	// register (the click/dialog gets lost, e.g. if it lands while the previous mutation's
	// invalidateAll re-render is still settling), leaving the button frozen mid-request.
	await expect(async () => {
		await memberBRow.locator('button.btn-warning').click();
		await expect.poll(isMemberBHeadDelegate, { timeout: 5_000 }).toBe(true);
	}).toPass({ timeout: 20_000 });
});
