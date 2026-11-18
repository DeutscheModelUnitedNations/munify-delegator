import type { Page } from '@playwright/test';
import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_MAKE_SUPERVISOR_CARE_ID,
	E2E_MAKE_SUPERVISOR_CONFERENCE_ID,
	E2E_MAKE_SUPERVISOR_PEOPLE
} from '../seed/makeSupervisor';

// Participant care turns a delegate too old for a delegation into the supervisor of the
// delegation they leave (e2e/seed/makeSupervisor.ts). The fixture is reset on every run; the
// specs run in order, since the first one uses up Olga's membership.
test.describe.configure({ mode: 'serial' });

const PARTICIPANTS = `/dashboard/${E2E_MAKE_SUPERVISOR_CONFERENCE_ID}/team/participants`;
const { olga, yara, yannick, sam } = E2E_MAKE_SUPERVISOR_PEOPLE;

type GraphQLResult<T> = {
	data?: T | null;
	errors?: { message: string; extensions?: { code?: string } }[];
};

async function graphql<T>(page: Page, query: string, variables: Record<string, unknown>) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult<T>;
}

test('a delegate cannot make anybody a supervisor', async ({ page }) => {
	await loginAs(page, fixedTestUser(yara.id));
	const result = await graphql(
		page,
		`
			mutation ($id: ID!) {
				makeDelegationMemberSupervisor(delegationMemberId: $id) {
					id
				}
			}
		`,
		{ id: olga.memberId }
	);
	expect(result.errors?.[0]?.extensions?.code, JSON.stringify(result)).toBe('NOT_FOUND');
});

test('participant care makes a delegate too old for a delegation its supervisor', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_MAKE_SUPERVISOR_CARE_ID), {
		startUrl: `${PARTICIPANTS}?userCard=${olga.id}`
	});

	const seatTab = page.getByRole('tab', { name: /platz|seat/i });
	await expect(seatTab).toBeVisible({ timeout: 15_000 });
	await seatTab.click();

	const notice = page.getByRole('alert').filter({ hasText: /zu alt für eine Delegation/ });
	await expect(notice).toBeVisible({ timeout: 15_000 });
	await notice.getByRole('button', { name: 'Zur Betreuung machen' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Zur Betreuung machen' }).click();
	await expect(page.getByText(/betreut jetzt die Delegation/)).toBeVisible({
		timeout: 15_000
	});

	const result = await graphql<{
		conferenceSupervisors: {
			user: { id: string };
			supervisedDelegationMembers: { user: { id: string } }[];
		}[];
		delegationMembers: { user: { id: string }; isHeadDelegate: boolean }[];
	}>(
		page,
		`
			query ($c: ID!) {
				conferenceSupervisors(where: { conference: { id: { eq: $c } } }) {
					user {
						id
					}
					supervisedDelegationMembers {
						user {
							id
						}
					}
				}
				delegationMembers(where: { conference: { id: { eq: $c } } }) {
					user {
						id
					}
					isHeadDelegate
				}
			}
		`,
		{ c: E2E_MAKE_SUPERVISOR_CONFERENCE_ID }
	);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();

	// Olga left the delegation, and somebody else leads it now
	const members = result.data?.delegationMembers ?? [];
	expect(members.map((member) => member.user.id).sort()).toEqual([yannick.id, yara.id].sort());
	expect(members.filter((member) => member.isHeadDelegate)).toHaveLength(1);

	// she supervises both who stayed, and Sam no longer supervises her
	const supervisors = result.data?.conferenceSupervisors ?? [];
	const supervised = (userId: string) =>
		supervisors
			.find((supervisor) => supervisor.user.id === userId)
			?.supervisedDelegationMembers.map((member) => member.user.id)
			.sort();
	expect(supervised(olga.id)).toEqual([yannick.id, yara.id].sort());
	expect(supervised(sam.id)).toEqual([]);
});

test('the notice is gone for a delegate of the right age', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_MAKE_SUPERVISOR_CARE_ID), {
		startUrl: `${PARTICIPANTS}?userCard=${yara.id}`
	});
	const seatTab = page.getByRole('tab', { name: /platz|seat/i });
	await expect(seatTab).toBeVisible({ timeout: 15_000 });
	await seatTab.click();
	await expect(page.getByRole('heading', { name: /Delegationsmitglieder/ })).toBeVisible({
		timeout: 15_000
	});
	await expect(page.getByRole('button', { name: 'Zur Betreuung machen' })).toHaveCount(0);
});
