import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_CONFERENCE_ID,
	E2E_MGMT_ADMIN_ID,
	E2E_MGMT_TARGET_FAMILY_NAME,
	E2E_MGMT_TARGET_USER_ID
} from '../seed/seed';

// Only reads, so it shares the management target with the specs that change it.
test('the user card opens on what is to do and keeps the person beside every tab', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/team/participants?userCard=${E2E_MGMT_TARGET_USER_ID}`
	});

	const card = page.getByRole('dialog').filter({ has: page.getByRole('tablist') });
	const opened = card.getByRole('tab', { name: /formalitäten|formalities/i });
	await expect(opened).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 });
	await expect(card.getByRole('tab', { name: /übersicht|overview/i })).toHaveCount(0);

	const person = card.getByRole('complementary');
	const name = person.getByRole('heading', {
		name: new RegExp(E2E_MGMT_TARGET_FAMILY_NAME, 'i')
	});
	for (const tab of [/formalitäten|formalities/i, /verlauf|history/i]) {
		await card.getByRole('tab', { name: tab }).click();
		await expect(name).toBeVisible();
	}

	// the details read as text, not as a form
	for (const label of [/^(adresse|address)$/i, /^(anmeldename|username)$/i])
		await expect(person.getByText(label)).toBeVisible();
	await expect(person.locator('input, select, textarea')).toHaveCount(0);
});
