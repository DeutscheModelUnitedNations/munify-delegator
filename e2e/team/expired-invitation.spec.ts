import { test, expect } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import {
	E2E_EXPIRED_INVITATION_EMAIL,
	E2E_INVITATIONS_CONFERENCE_ID,
	E2E_INVITATIONS_PM_ID,
	E2E_REPLACED_INVITATION_EMAIL
} from '../seed/invitations';

test('an expired invitation is sent again from its row', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_INVITATIONS_PM_ID), {
		startUrl: `/dashboard/${E2E_INVITATIONS_CONFERENCE_ID}/team/invitations`
	});
	await waitForHydration(page);

	const row = page.locator('tbody tr', { hasText: E2E_EXPIRED_INVITATION_EMAIL });
	await expect(row).toContainText(/abgelaufen|expired/i, { timeout: 15_000 });
	await row.getByRole('button', { name: /erneut einladen|invite again/i }).click();

	// The row follows live: valid again, with the ordinary resend button
	await expect(row).not.toContainText(/abgelaufen|expired/i, { timeout: 15_000 });
	await expect(row.getByRole('button', { name: /erneut einladen|invite again/i })).toHaveCount(0);
	await expect(
		row.getByRole('button', { name: /einladung erneut senden|resend invitation/i })
	).toBeVisible();

	// And the new link was mailed
	await expect
		.poll(
			async () => {
				const res = await page.request.post('/api/graphql', {
					data: {
						query: `query { emailLogs(where: { conferenceId: { eq: "${E2E_INVITATIONS_CONFERENCE_ID}" }, kind: TEAM_INVITATION, email: { eq: "${E2E_EXPIRED_INVITATION_EMAIL}" } }) { trigger sentById } }`
					}
				});
				return (await res.json())?.data?.emailLogs ?? [];
			},
			{ timeout: 15_000 }
		)
		.toContainEqual({ trigger: 'MANUAL', sentById: E2E_INVITATIONS_PM_ID });
});

test('inviting the address of an expired invitation replaces it', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_INVITATIONS_PM_ID), {
		startUrl: `/dashboard/${E2E_INVITATIONS_CONFERENCE_ID}/team/invitations`
	});
	await waitForHydration(page);
	const row = page.locator('tbody tr', { hasText: E2E_REPLACED_INVITATION_EMAIL });
	await expect(row).toContainText(/abgelaufen|expired/i, { timeout: 15_000 });

	await page
		.getByRole('button', { name: /mitglieder einladen|invite members/i })
		.first()
		.click();
	const modal = page.locator('.modal-open, dialog[open]').first();
	await modal.locator('textarea').fill(E2E_REPLACED_INVITATION_EMAIL);
	await modal.getByRole('button', { name: /e-mails prüfen|check emails/i }).click();
	await modal.getByRole('button', { name: /einladungen senden|send invitations/i }).click();

	// One row for the address: the new invitation, in the role chosen now
	await expect(row).toHaveCount(1, { timeout: 15_000 });
	await expect(row).not.toContainText(/abgelaufen|expired/i, { timeout: 15_000 });
	await expect(row).toContainText(/mitglied|member/i);

	// Still open, it is not invited a second time
	const res = await page.request.post('/api/graphql', {
		data: {
			query: `mutation { createTeamMemberInvitations(conferenceId: "${E2E_INVITATIONS_CONFERENCE_ID}", invitations: [{ email: "${E2E_REPLACED_INVITATION_EMAIL}", role: MEMBER }]) { created { id } errors { email } } }`
		}
	});
	expect((await res.json())?.data?.createTeamMemberInvitations).toMatchObject({
		created: [],
		errors: [{ email: E2E_REPLACED_INVITATION_EMAIL }]
	});
});
