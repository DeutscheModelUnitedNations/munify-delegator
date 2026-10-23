import { test, expect, type Page } from '@playwright/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_SEATS_CONFERENCE_ID,
	E2E_SEATS_DELEGATES,
	E2E_SEATS_GV_ID,
	E2E_SEATS_PARTICIPANT_CARE_ID
} from '../seed/seats';

// The switch specs move delegates, so the specs run in order. The fixture (e2e/seed/seats.ts) is
// reset on every run; within a run, later specs only rely on Carla and Dora staying in France.
test.describe.configure({ mode: 'serial' });

const SEATS = `/management/${E2E_SEATS_CONFERENCE_ID}/seats`;
const { anna, bert, carla, dora } = E2E_SEATS_DELEGATES;

interface GraphQLResponse<T> {
	data?: T | null;
	errors?: { message: string }[];
}

async function graphql<T = unknown>(
	page: Page,
	query: string,
	variables: Record<string, unknown> = {}
): Promise<GraphQLResponse<T>> {
	const res = await page.request.post('/api/graphql', { data: { query, variables } });
	return await res.json();
}

/** Every delegate of the conference as "nation committee", with "head" for head delegates */
async function seats(page: Page) {
	const { data } = await graphql<{
		findManyDelegationMembers: {
			isHeadDelegate: boolean;
			user: { id: string };
			assignedCommittee: { abbreviation: string } | null;
			delegation: { assignedNation: { alpha3Code: string } | null };
		}[];
	}>(
		page,
		`
			query ($conferenceId: String!) {
				findManyDelegationMembers(where: { conferenceId: { equals: $conferenceId } }) {
					isHeadDelegate
					user {
						id
					}
					assignedCommittee {
						abbreviation
					}
					delegation {
						assignedNation {
							alpha3Code
						}
					}
				}
			}
		`,
		{ conferenceId: E2E_SEATS_CONFERENCE_ID }
	);
	return Object.fromEntries(
		(data?.findManyDelegationMembers ?? []).map((x) => [
			x.user.id,
			[
				x.delegation.assignedNation?.alpha3Code,
				x.assignedCommittee?.abbreviation ?? '-',
				x.isHeadDelegate ? 'head' : ''
			]
				.join(' ')
				.trim()
		])
	);
}

const SWITCH_MUTATION = `mutation(
	$conferenceId: ID!
	$memberId: ID!
	$otherMemberId: ID
	$targetNationAlpha3Code: String
	$targetCommitteeId: ID
	$headDelegateMemberIds: [ID!]
) {
	switchDelegationMemberSeats(
		conferenceId: $conferenceId
		memberId: $memberId
		otherMemberId: $otherMemberId
		targetNationAlpha3Code: $targetNationAlpha3Code
		targetCommitteeId: $targetCommitteeId
		headDelegateMemberIds: $headDelegateMemberIds
	) { id }
}`;

const nationRow = (page: Page, alpha3Code: string) =>
	page.locator('tbody tr').filter({ hasText: alpha3Code });
const initials = (page: Page, alpha3Code: string, delegate: { given: string; family: string }) =>
	nationRow(page, alpha3Code).getByRole('button', {
		name: `${delegate.given[0]}${delegate.family[0]}`,
		exact: true
	});
const modal = (page: Page) => page.locator('.modal-open');

async function openSeatsInSwitchMode(page: Page) {
	await loginAs(page, fixedTestUser(E2E_SEATS_PARTICIPANT_CARE_ID), { startUrl: SEATS });
	const toggle = page.getByRole('checkbox', { name: /Plätze tauschen/ });
	await expect(async () => {
		await toggle.check();
		await expect(toggle).toBeChecked({ timeout: 2_000 });
	}).toPass({ timeout: 15_000 });
}

test('two delegates of different delegations swap seats and each delegation keeps one head', async ({
	page
}) => {
	await openSeatsInSwitchMode(page);

	await initials(page, 'DEU', anna).click();
	await initials(page, 'FRA', carla).click();

	// both head delegates change delegation, so the modal asks who leads afterwards
	await expect(modal(page).getByText('Delegationsleitung danach')).toBeVisible();
	await modal(page)
		.getByRole('button', { name: /Bestätigen/ })
		.click();
	await expect(page.getByText('Plätze getauscht')).toBeVisible({ timeout: 15_000 });

	// the head role stays with the seat
	await expect
		.poll(() => seats(page))
		.toMatchObject({
			[anna.id]: 'fra STGV head',
			[carla.id]: 'deu STGV head',
			[bert.id]: 'deu STSR',
			[dora.id]: 'fra -'
		});

	// put them back without the UI
	const { errors } = await graphql(page, SWITCH_MUTATION, {
		conferenceId: E2E_SEATS_CONFERENCE_ID,
		memberId: anna.memberId,
		otherMemberId: carla.memberId
	});
	expect(errors).toBeUndefined();
	expect(await seats(page)).toMatchObject({
		[anna.id]: 'deu STGV head',
		[carla.id]: 'fra STGV head'
	});
});

test('a delegate moves into a free seat of a role without a delegation, a taken seat is refused', async ({
	page
}) => {
	await openSeatsInSwitchMode(page);

	await initials(page, 'DEU', bert).click();
	// committee columns have no fixed order, so the seat is picked by its label
	await page.getByRole('button', { name: 'Hierher verschieben: Italien / STGV' }).click();

	// nobody leads a delegation that is affected, so there is nothing to choose
	await expect(modal(page).getByText(/Bert Beta/i)).toBeVisible();
	await expect(modal(page).getByText('Delegationsleitung danach')).toHaveCount(0);
	await modal(page)
		.getByRole('button', { name: /Bestätigen/ })
		.click();
	await expect(page.getByText('Plätze getauscht')).toBeVisible({ timeout: 15_000 });

	// Italy's delegation is created with Bert as its only member and head
	await expect.poll(() => seats(page)).toMatchObject({ [bert.id]: 'ita STGV head' });

	const { errors } = await graphql(page, SWITCH_MUTATION, {
		conferenceId: E2E_SEATS_CONFERENCE_ID,
		memberId: bert.memberId,
		targetNationAlpha3Code: 'deu',
		targetCommitteeId: E2E_SEATS_GV_ID
	});
	expect(errors?.[0].message).toBe('The target seat is already taken.');
	expect(await seats(page)).toMatchObject({
		[bert.id]: 'ita STGV head',
		[anna.id]: 'deu STGV head'
	});
});

test('the member menu lists delegates without a committee and opens their user card', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_SEATS_PARTICIPANT_CARE_ID), { startUrl: SEATS });

	const menu = page.locator('[popover]:popover-open');
	await expect(async () => {
		await nationRow(page, 'FRA').getByRole('button', { name: 'Delegationsmitglieder' }).click();
		await expect(menu).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 15_000 });

	await expect(menu.getByText('E2E Schule Paris')).toBeVisible();

	// the button that opened the menu closes it again
	const menuButton = nationRow(page, 'FRA').getByRole('button', { name: 'Delegationsmitglieder' });
	await menuButton.click();
	await expect(menu).toHaveCount(0);
	await menuButton.click();
	await expect(menu).toBeVisible();
	const doraEntry = menu.getByRole('button', { name: /Dora Delta/i });
	await expect(doraEntry).toContainText('ohne Gremium');

	await doraEntry.click();
	await expect(page).toHaveURL(new RegExp(`userCard=${dora.id}`));
	await expect(page.getByRole('heading', { name: /Delta/i })).toBeVisible({ timeout: 15_000 });
});

test('the user card says so when the ID does not exist', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_SEATS_PARTICIPANT_CARE_ID), {
		startUrl: `${SEATS}?userCard=e2e-seats-nobody`
	});

	await expect(page.getByText('Nutzer*in nicht gefunden')).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText('Zu der ID e2e-seats-nobody gibt es keine Person.')).toBeVisible();
});

test('the user card shows an error instead of empty fields and recovers on retry', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_SEATS_PARTICIPANT_CARE_ID), { startUrl: SEATS });

	// the card's main query cannot reach the server
	const failCardQuery = (route: Parameters<Parameters<Page['route']>[1]>[0]) =>
		route.request().postData()?.includes('UserCardMainQuery') ? route.abort() : route.fallback();
	await page.route('**/api/graphql', failCardQuery);

	await page.goto(`${SEATS}?userCard=${carla.id}`);
	const retry = page.getByRole('button', { name: /Erneut versuchen/ });
	await expect(retry).toBeVisible({ timeout: 15_000 });
	await expect(page.getByRole('heading', { name: /Gamma/i })).toHaveCount(0);

	await page.unroute('**/api/graphql', failCardQuery);
	await retry.click();
	await expect(page.getByRole('heading', { name: /Gamma/i })).toBeVisible({ timeout: 15_000 });
});
