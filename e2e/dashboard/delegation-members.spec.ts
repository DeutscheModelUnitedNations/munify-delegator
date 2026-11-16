import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_PREP_CODELEGATE_USER_ID,
	E2E_PREP_CONFERENCE_ID,
	E2E_PREP_PARTICIPANT_USER_ID
} from '../seed/seed';

// Co-delegates settle their committees among themselves, so once the assignment is out the
// dashboard's member table offers each one's email address.
test('a delegate can write to their co-delegates from the dashboard', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_PREP_PARTICIPANT_USER_ID), {
		startUrl: `/dashboard/${E2E_PREP_CONFERENCE_ID}`
	});

	await expect(
		page.locator(`a[href="mailto:${E2E_PREP_CODELEGATE_USER_ID}@e2e.test"]`)
	).toBeVisible({ timeout: 30_000 });
});
