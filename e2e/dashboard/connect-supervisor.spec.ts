import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_CONFERENCE_ID,
	E2E_CONNECT_PARTICIPANT_ID,
	E2E_SUPERVISOR_CONNECTION_CODE,
	E2E_SUPERVISOR_ID
} from '../seed/seed';

async function graphql(page: import('@playwright/test').Page, query: string) {
	const res = await page.request.post('/api/graphql', { data: { query } });
	return (await res.json())?.data;
}

// Covers a participant linking themselves to an existing supervisor via connection code - a
// self-service action distinct from the supervisor's own dashboard (supervisor.spec.ts), and
// only reachable once a participant already has a registration (see connectToConferenceSupervisor
// resolver: it throws if the caller isn't already a delegation member or single participant).
test('a participant can connect themselves to a supervisor via connection code', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_CONNECT_PARTICIPANT_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/connectSupervisor?code=${E2E_SUPERVISOR_CONNECTION_CODE}`
	});

	const connectButton = page.getByRole('button', { name: 'Verbinden' });
	await expect(connectButton).toBeVisible({ timeout: 15_000 });
	await connectButton.click();

	await page.waitForURL(new RegExp(`/dashboard/${E2E_CONFERENCE_ID}$`), {
		timeout: 15_000,
		waitUntil: 'commit'
	});

	// The participant can read their own SingleParticipant record (including `supervisors`), but
	// not the supervisor's full supervised-participant list, so verify from their own side.
	const data = await graphql(
		page,
		`query { findUniqueSingleParticipant(where: { conferenceId_userId: { conferenceId: "${E2E_CONFERENCE_ID}", userId: "${E2E_CONNECT_PARTICIPANT_ID}" } }) { supervisors { id } } }`
	);
	const supervisorIds = data?.findUniqueSingleParticipant?.supervisors?.map(
		(s: { id: string }) => s.id
	);
	expect(supervisorIds).toContain(E2E_SUPERVISOR_ID);
});
