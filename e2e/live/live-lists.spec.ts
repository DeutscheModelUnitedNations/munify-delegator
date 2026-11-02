import type { Page } from '@playwright/test';
import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_SEAT_CONFERENCE_ID,
	E2E_SEAT_LIVE_TEAM_FAMILY_NAME,
	E2E_SEAT_LIVE_TEAM_ID,
	E2E_SEAT_PM_ID,
	E2E_SEAT_SR_ID
} from '../seed/seatPlanning';

/** Writes as another session would: straight to the API, never through the page under test. */
async function graphql(page: Page, query: string) {
	const res = await page.request.post('/api/graphql', { data: { query } });
	return (await res.json()) as { data?: Record<string, unknown> };
}

// A live list has to follow rows that somebody else creates and deletes. The query and the
// subscription of a live query are separate fields to graphcache, so this only works because
// `liveQueryUpdates` ($lib/api/cacheUpdates.ts) writes each subscription result onto the query.
test('a live list shows rows created and deleted elsewhere', async ({ page }) => {
	test.setTimeout(90_000);
	await loginAs(page, fixedTestUser(E2E_SEAT_PM_ID), {
		startUrl: `/dashboard/${E2E_SEAT_CONFERENCE_ID}/team/configuration?tab=committees`
	});
	await page.getByRole('heading', { name: /Generalversammlung/ }).waitFor({ timeout: 15_000 });

	// A change made while the page's subscription is still computing its first result is lost
	// (the server answers with what it read before the change). So first make sure it is live:
	// keep changing an existing committee until the page shows it.
	const marker = `Live check ${Date.now()}`;
	await expect(async () => {
		await graphql(
			page,
			`mutation { updateCommittee(id: "${E2E_SEAT_SR_ID}", resolutionHeadline: "${marker}") { id } }`
		);
		await expect(page.getByText(marker)).toBeVisible({ timeout: 3_000 });
	}).toPass({ timeout: 30_000 });

	try {
		const abbreviation = `L${Date.now() % 100000}`;
		const created = await graphql(
			page,
			`mutation { createCommittee(conferenceId: "${E2E_SEAT_CONFERENCE_ID}", name: "Live", abbreviation: "${abbreviation}", numOfSeatsPerDelegation: 1) { id } }`
		);
		const committee = created.data?.createCommittee;
		const id =
			typeof committee === 'object' && committee && 'id' in committee ? String(committee.id) : '';

		const heading = page.getByRole('heading', { name: `Live (${abbreviation})` });
		await expect(heading).toHaveCount(1, { timeout: 15_000 });
		// It used to flicker in and vanish again when the stale query result came back.
		await page.waitForTimeout(2_000);
		await expect(heading).toHaveCount(1);

		await graphql(page, `mutation { deleteCommittee(id: "${id}") }`);
		await expect(heading).toHaveCount(0, { timeout: 15_000 });
	} finally {
		await graphql(
			page,
			`mutation { updateCommittee(id: "${E2E_SEAT_SR_ID}", resolutionHeadline: null) { id } }`
		);
	}
});

// The server tables (team members, waiting list) used to slice their live list inside the fetch,
// after an await, where Svelte does not track the read: the page never heard of a new row.
test('the team members table shows someone added and removed elsewhere', async ({ page }) => {
	test.setTimeout(90_000);
	await loginAs(page, fixedTestUser(E2E_SEAT_PM_ID), {
		startUrl: `/dashboard/${E2E_SEAT_CONFERENCE_ID}/team/members`
	});
	await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 20_000 });
	const row = page.locator('tbody tr', { hasText: E2E_SEAT_LIVE_TEAM_FAMILY_NAME });
	await expect(row).toHaveCount(0);

	// As above: a change made before the subscription has its first result is lost, so add and
	// remove until the page shows the addition.
	const add = () =>
		graphql(
			page,
			`mutation { createTeamMemberInvitations(conferenceId: "${E2E_SEAT_CONFERENCE_ID}", invitations: [{ email: "${E2E_SEAT_LIVE_TEAM_ID}@e2e.test", role: MEMBER }]) { created { id } } }`
		);
	const remove = async () => {
		const found = await graphql(
			page,
			`query { teamMembers(where: { conferenceId: { eq: "${E2E_SEAT_CONFERENCE_ID}" }, userId: { eq: "${E2E_SEAT_LIVE_TEAM_ID}" } }) { id } }`
		);
		const members = Array.isArray(found.data?.teamMembers) ? found.data.teamMembers : [];
		for (const member of members) {
			const id = typeof member === 'object' && member && 'id' in member ? String(member.id) : '';
			await graphql(page, `mutation { deleteTeamMember(id: "${id}") }`);
		}
	};

	try {
		await expect(async () => {
			await remove();
			await add();
			await expect(row).toHaveCount(1, { timeout: 3_000 });
		}).toPass({ timeout: 30_000 });

		await remove();
		await expect(row).toHaveCount(0, { timeout: 15_000 });
	} finally {
		await remove();
	}
});
