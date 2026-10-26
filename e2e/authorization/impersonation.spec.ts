import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, makeTestUser, waitForHydration } from '../support/auth';
import {
	E2E_MGMT_ADMIN_ID,
	E2E_MGMT_TARGET_USER_ID,
	E2E_PAYMENT_ADMIN_ID,
	E2E_PREP_PARTICIPANT_USER_ID
} from '../seed/seed';

// Impersonation runs through the mock's copy of Logto's flow (a subject token from the Management
// API, exchanged with the impersonator's token as actor), so these pin down the whole chain: who
// may impersonate whom, that the session is the target's afterwards, that it never lends a role,
// and that the impersonation cannot be carried into somebody else's session.

async function graphql(page: Page, query: string) {
	const res = await page.request.post('/api/graphql', { data: { query } });
	return res.json();
}

const status = (page: Page) =>
	graphql(
		page,
		'query { impersonationStatus { isImpersonating originalUser { sub } impersonatedUser { sub email } } }'
	).then((json) => json.data.impersonationStatus);

const start = (page: Page, targetUserId: string) =>
	graphql(page, `mutation { startImpersonation(targetUserId: "${targetUserId}") }`);

const canImpersonate = (page: Page, targetUserId: string) =>
	graphql(page, `query { canImpersonateUser(targetUserId: "${targetUserId}") }`).then(
		(json) => json.data.canImpersonateUser
	);

test('participant care acts as a participant of their conference, and stops again', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID));
	expect(await canImpersonate(page, E2E_MGMT_TARGET_USER_ID)).toBe(true);

	expect((await start(page, E2E_MGMT_TARGET_USER_ID)).errors).toBeUndefined();
	expect(await status(page)).toEqual({
		isImpersonating: true,
		originalUser: { sub: E2E_MGMT_ADMIN_ID },
		impersonatedUser: { sub: E2E_MGMT_TARGET_USER_ID, email: `${E2E_MGMT_TARGET_USER_ID}@e2e.test` }
	});

	// The whole app sees the target now, the header too
	await page.goto('/dashboard');
	await waitForHydration(page);
	// The header asks for the status once it is mounted
	const stop = page.getByRole('button', { name: /^(stellvertretung beenden|stop)$/i });
	await expect(stop).toBeVisible({ timeout: 15_000 });

	// No second impersonation on top, and no sign-in upsert writing the target's row
	const nested = await start(page, E2E_PAYMENT_ADMIN_ID);
	expect(nested.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
	const upsert = await graphql(page, 'mutation { upsertSelf { userId } }');
	expect(upsert.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');

	await stop.click();
	await expect.poll(() => status(page)).toMatchObject({ isImpersonating: false });
});

test('participant care may not act as teammates, outsiders or themselves', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID));

	for (const target of [E2E_PAYMENT_ADMIN_ID, E2E_PREP_PARTICIPANT_USER_ID, E2E_MGMT_ADMIN_ID]) {
		expect(await canImpersonate(page, target), target).toBe(false);
		const json = await start(page, target);
		expect(json.errors?.[0]?.extensions?.code, target).toBe('FORBIDDEN');
	}
	expect((await status(page)).isImpersonating).toBe(false);
});

test('a plain participant may not act as anybody', async ({ page }) => {
	await loginAs(page, makeTestUser('impersonation-outsider'));
	expect(await canImpersonate(page, E2E_MGMT_TARGET_USER_ID)).toBe(false);
	expect((await start(page, E2E_MGMT_TARGET_USER_ID)).errors?.[0]?.extensions?.code).toBe(
		'FORBIDDEN'
	);
});

test('acting as somebody never lends the system admin role', async ({ page }) => {
	await loginAs(page, makeTestUser('impersonation-admin', { roles: ['admin'] }));
	const roles = () => graphql(page, 'query { myOIDCRoles }').then((json) => json.data.myOIDCRoles);
	expect(await roles()).toEqual(['admin']);

	expect((await start(page, E2E_MGMT_TARGET_USER_ID)).errors).toBeUndefined();
	expect((await status(page)).impersonatedUser.sub).toBe(E2E_MGMT_TARGET_USER_ID);
	expect(await roles()).toEqual([]);

	await graphql(page, 'mutation { stopImpersonation }');
	expect(await roles()).toEqual(['admin']);
});

test('an impersonation cannot be carried into another session', async ({ page, browser }) => {
	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID));
	expect((await start(page, E2E_MGMT_TARGET_USER_ID)).errors).toBeUndefined();
	const impersonationCookies = (await page.context().cookies()).filter((cookie) =>
		cookie.name.includes('impersonation')
	);
	expect(impersonationCookies.length).toBeGreaterThan(0);

	// Someone else's browser, with the impersonation cookies copied over
	const other = await browser.newContext();
	const otherPage = await other.newPage();
	try {
		const outsider = makeTestUser('impersonation-thief');
		await loginAs(otherPage, outsider);
		await other.addCookies(impersonationCookies);

		const stolen = await status(otherPage);
		expect(stolen.isImpersonating).toBe(false);
		// ... and dropped rather than kept around
		const left = (await other.cookies()).filter((cookie) => cookie.name.includes('impersonation'));
		expect(left).toEqual([]);

		// Without any session of its own the cookie is no session either
		await other.clearCookies();
		await other.addCookies(impersonationCookies);
		const anonymous = await graphql(otherPage, 'query { impersonationStatus { isImpersonating } }');
		expect(anonymous.data.impersonationStatus.isImpersonating).toBe(false);
	} finally {
		await other.close();
	}

	await graphql(page, 'mutation { stopImpersonation }');
});
