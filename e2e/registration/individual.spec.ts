import { test, expect } from '../support/test';
import { loginAs, makeTestUser } from '../support/auth';
import {
	chooseApplyPath,
	fillApplicationSteps,
	openFirstConferenceForRegistration
} from '../support/registration';

test('a new user can register as an individual participant', async ({ page }) => {
	const user = makeTestUser('individual');
	await loginAs(page, user);

	await openFirstConferenceForRegistration(page);

	await chooseApplyPath(page, /Einzelbewerbung/);

	// pick the first available role; the questions open below it
	await page.locator('ol .card button.btn-primary').first().click();

	await fillApplicationSteps(page, {
		school: 'E2E Test School',
		motivation: 'I want to represent my country.',
		experience: 'This is my first conference.'
	});

	// The form never leaves the dashboard: once the application exists, the dashboard shows it.
	await expect(page.locator('section', { hasText: 'Rollenbewerbungen' })).toBeVisible({
		timeout: 15_000
	});
});
