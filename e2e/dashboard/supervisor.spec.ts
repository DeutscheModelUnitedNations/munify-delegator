import { test, expect } from '@playwright/test';
import { loginAs, makeTestUser, waitForHydration } from '../support/auth';
import { openFirstConferenceForRegistration } from '../support/registration';

// Covers the supervisor self-service flow: signup, toggling own attendance, and rotating the
// connection code students use to link to this supervisor. None of this is exercised by the
// registration tests (which only cover delegate/individual paths).
test('a supervisor can sign up, toggle their own attendance, and rotate their connection code', async ({
	page
}) => {
	const supervisor = makeTestUser('supervisor');
	await loginAs(page, supervisor, { startUrl: '/registration' });
	await openFirstConferenceForRegistration(page);

	await page.locator('a[href$="/supervisor"]').click();
	await page.waitForURL(/\/supervisor$/);

	// Retry the click: it's the first interaction right after a client-side navigation, which can
	// land before hydration attaches the handler. The success handler itself does a client-side
	// `goto()`, not a full navigation, so there's no 'load' event to wait for - just poll the URL.
	await expect(async () => {
		await page.getByRole('button', { name: 'Jetzt anmelden' }).click();
		await page.waitForURL(/\/dashboard(\/.+)?$/, { timeout: 3_000, waitUntil: 'commit' });
	}).toPass({ timeout: 20_000 });
	await waitForHydration(page);

	// --- toggle own attendance off (defaults to true on signup) ---
	const attendanceToggle = page.locator('input[type="checkbox"].toggle-success');
	await expect(attendanceToggle).toBeChecked({ timeout: 15_000 });
	await attendanceToggle.click();
	await expect(page.getByText(/nicht.*teilnehmen|not.*attending/i)).toBeVisible({
		timeout: 15_000
	});

	// --- rotate the connection code ---
	const connectionCode = page.locator('p.font-mono');
	await expect(connectionCode).toBeVisible({ timeout: 15_000 });
	const originalCode = (await connectionCode.textContent())?.trim();
	await page.getByRole('button', { name: 'Rotate entry code' }).click();
	await expect(connectionCode).not.toHaveText(originalCode!, { timeout: 15_000 });

	// --- verify both changes actually persisted server-side, not just client-side state ---
	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query { findManyConferenceSupervisors(where: { user: { email: { equals: "${supervisor.email}" } } }) { plansOwnAttendenceAtConference connectionCode } }`
		}
	});
	const data = (await res.json())?.data?.findManyConferenceSupervisors?.[0];
	expect(data?.plansOwnAttendenceAtConference).toBe(false);
	expect(data?.connectionCode).not.toBe(originalCode);
});
