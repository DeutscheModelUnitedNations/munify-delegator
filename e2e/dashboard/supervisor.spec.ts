import { test, expect } from '../support/test';
import { loginAs, makeTestUser, waitForHydration } from '../support/auth';
import { chooseApplyPath, openFirstConferenceForRegistration } from '../support/registration';

// Covers the supervisor self-service flow: signup, toggling own attendance, and rotating the
// connection code students use to link to this supervisor. None of this is exercised by the
// registration tests (which only cover delegate/individual paths).
test('a supervisor can sign up, toggle their own attendance, and rotate their connection code', async ({
	page
}) => {
	const supervisor = makeTestUser('supervisor');
	await loginAs(page, supervisor);
	await openFirstConferenceForRegistration(page);

	await chooseApplyPath(page, /Betreuer\*in/);

	// The school step (left empty), then attending in person, then signing up. The signup stays
	// on the dashboard, which turns into the supervisor's once it lands.
	await page
		.locator('ol > li')
		.last()
		.getByRole('button', { name: /weiter|next/i })
		.click();
	await page.getByRole('radio', { name: /Ich komme mit/ }).click();
	await page.getByRole('button', { name: 'Als Betreuer*in registrieren' }).click();

	// Wait for the dashboard's connection code, which only the supervisor stage renders, so the
	// toggle below is the dashboard's.
	const connectionCode = page.locator('p.font-mono');
	await expect(connectionCode).toBeVisible({ timeout: 15_000 });

	// --- toggle own attendance off (defaults to true on signup) ---
	const attendanceToggle = page.locator('input[type="checkbox"].toggle-success');
	await expect(attendanceToggle).toBeChecked({ timeout: 15_000 });
	await attendanceToggle.click();
	await expect(page.getByText(/nicht.*teilnehmen|not.*attending/i)).toBeVisible({
		timeout: 15_000
	});

	// --- rotate the connection code ---
	const originalCode = (await connectionCode.textContent())?.trim();
	await page.getByRole('button', { name: /code erneuern|rotate code/i }).click();
	await expect(connectionCode).not.toHaveText(originalCode!, { timeout: 15_000 });

	// --- verify both changes actually persisted server-side, not just client-side state ---
	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query { conferenceSupervisors(where: { user: { email: { eq: "${supervisor.email}" } } }) { plansOwnAttendenceAtConference connectionCode } }`
		}
	});
	const data = (await res.json())?.data?.conferenceSupervisors?.[0];
	expect(data?.plansOwnAttendenceAtConference).toBe(false);
	expect(data?.connectionCode).not.toBe(originalCode);
});
