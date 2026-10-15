import { test } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_ASSIGNMENT_ADMIN_ID, E2E_CONFERENCE_ID } from '../seed/seed';
test('trace invariant', async ({ page }) => {
	page.on('pageerror', (e) => console.log('PAGEERROR', e.stack));
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID, { roles: ['admin'] }), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}`
	});
	for (const p of ['team/seats', 'team/seat-planning']) {
		console.log('GOTO', p);
		await page.goto(`/dashboard/${E2E_CONFERENCE_ID}/${p}`);
		await waitForHydration(page);
		await page.waitForTimeout(3000);
	}
});
