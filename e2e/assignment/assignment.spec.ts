import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_ASSIGNMENT_ADMIN_ID,
	E2E_ASSIGNMENT_DELEGATION_ID,
	E2E_ASSIGNMENT_NATION_ALPHA2,
	E2E_ASSIGNMENT_NATION_ALPHA3,
	E2E_CONFERENCE_ID,
	E2E_COMMITTEE_ID
} from '../seed/seed';

// The assignment-assistant wizard itself is a local drag-and-drop editor over a downloaded JSON
// snapshot (see e2e/seed/seed.ts's module doc) - it never calls the backend directly. The actual
// `sendAssignmentData` mutation is only triggered from the management "apply assignment" page via
// an uploaded JSON file, so we build that JSON directly rather than automating the drag-and-drop
// wizard (which uses @thisux/sveltednd - flaky to drive from Playwright and not what's under test
// here: the backend assignment logic).
test('an admin can apply a nation assignment to a delegation via the assignment JSON upload', async ({
	page
}) => {
	page.on('dialog', (dialog) => dialog.accept());

	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
		startUrl: `/management/${E2E_CONFERENCE_ID}/assignment`
	});

	const projectData = {
		conference: {
			id: E2E_CONFERENCE_ID,
			title: 'E2E Test Conference',
			startConference: new Date().toISOString(),
			committees: [
				{
					id: E2E_COMMITTEE_ID,
					name: 'E2E Test Committee',
					abbreviation: 'E2E',
					numOfSeatsPerDelegation: 1,
					nations: [
						{ alpha2Code: E2E_ASSIGNMENT_NATION_ALPHA2, alpha3Code: E2E_ASSIGNMENT_NATION_ALPHA3 }
					]
				}
			],
			nonStateActors: [],
			individualApplicationOptions: []
		},
		delegations: [
			{
				id: E2E_ASSIGNMENT_DELEGATION_ID,
				appliedForRoles: [],
				members: [],
				assignedNation: {
					alpha2Code: E2E_ASSIGNMENT_NATION_ALPHA2,
					alpha3Code: E2E_ASSIGNMENT_NATION_ALPHA3
				}
			}
		],
		singleParticipants: []
	};

	await page.locator('input[type="file"]').setInputFiles({
		name: 'assignment.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(projectData))
	});

	const applyButton = page.getByRole('button', { name: /zuweisung anwenden|apply assignment/i });
	await expect(applyButton).toBeEnabled({ timeout: 10_000 });
	await applyButton.click();

	await expect
		.poll(
			async () => {
				const res = await page.request.post('/api/graphql', {
					data: {
						query: `query { findUniqueDelegation(where: { id: "${E2E_ASSIGNMENT_DELEGATION_ID}" }) { assignedNation { alpha3Code } } }`
					}
				});
				const json = await res.json();
				return json?.data?.findUniqueDelegation?.assignedNation?.alpha3Code;
			},
			{ timeout: 15_000 }
		)
		.toBe(E2E_ASSIGNMENT_NATION_ALPHA3);
});
