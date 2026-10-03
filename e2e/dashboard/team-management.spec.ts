import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_ASSIGNMENT_ADMIN_ID } from '../seed/seed';

// Team management (invitations + the TeamMemberInvitation resolver) had no coverage. It is also
// permission-sensitive: the layout only admits system admins, PROJECT_MANAGEMENT and
// TEAM_COORDINATOR, so this doubles as a check that a PROJECT_MANAGEMENT member is admitted.

test('a project manager can invite a team member by email', async ({ page }) => {
	// Unique per run so repeated runs against a persistent database never collide on an
	// already-invited address.
	const invitee = `e2e-invitee-${Date.now()}@e2e.test`;

	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/team-management/invitations`
	});
	await waitForHydration(page);

	await page
		.getByRole('button', { name: /mitglieder einladen|invite team members/i })
		.first()
		.click();

	const modal = page.locator('.modal-open, dialog[open]').first();
	await expect(modal).toBeVisible({ timeout: 15_000 });

	await modal.locator('textarea').fill(invitee);
	await modal.getByRole('button', { name: /e-mails prüfen|check emails/i }).click();

	// Review step: the parsed address must be listed and selected before it can be sent.
	await expect(modal.getByText(invitee).first()).toBeVisible({ timeout: 15_000 });
	await modal.getByRole('button', { name: /einladungen senden|send invitations/i }).click();

	await expect
		.poll(
			async () => {
				const res = await page.request.post('/api/graphql', {
					data: {
						query: `query { findManyTeamMemberInvitations(where: { conferenceId: { equals: "${E2E_CONFERENCE_ID}" }, email: { equals: "${invitee}" } }) { email role } }`
					}
				});
				return (await res.json())?.data?.findManyTeamMemberInvitations?.length ?? 0;
			},
			{ timeout: 15_000 }
		)
		.toBe(1);
});
