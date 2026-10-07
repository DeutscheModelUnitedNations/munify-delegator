import type { Page } from '@playwright/test';
import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_SEAT_ASSIGNED_NSA_ID,
	E2E_SEAT_ASSIGNED_NSA_NAME,
	E2E_SEAT_CONFERENCE_ID,
	E2E_SEAT_CONTENT_LEAD_ID,
	E2E_SEAT_DELEGATE_FAMILY_NAME,
	E2E_SEAT_GV_ID,
	E2E_SEAT_PARTICIPANT_CARE_ID,
	E2E_SEAT_PM_ID,
	E2E_SEAT_SR_ID
} from '../seed/seatPlanning';

// The fixture (e2e/seed/seatPlanning.ts) is reset on every run, but the specs below change it, so
// they run in order and each one leaves the seats as it found them.
test.describe.configure({ mode: 'serial' });

const MANAGEMENT = `/dashboard/${E2E_SEAT_CONFERENCE_ID}/management`;
const SEAT_PLANNING = `${MANAGEMENT}/seat-planning`;

interface GraphQLResponse<T> {
	data?: T | null;
	errors?: { message: string }[];
}

async function graphql<T = unknown>(page: Page, query: string): Promise<GraphQLResponse<T>> {
	const res = await page.request.post('/api/graphql', { data: { query } });
	return await res.json();
}

async function committeeNations(page: Page, committeeId: string) {
	const { data } = await graphql<{
		committee: { nations: { alpha3Code: string }[] } | null;
	}>(page, `query { committee(id: "${committeeId}") { nations { alpha3Code } } }`);
	return (data?.committee?.nations ?? []).map((nation) => nation.alpha3Code).sort();
}

test('the project management sets a seat live and can undo it', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_SEAT_PM_ID), { startUrl: SEAT_PLANNING });

	const cell = page.getByRole('button', { name: 'Deutschland: SPSR', exact: true });
	await expect(cell).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 });

	await expect(async () => {
		await cell.click();
		await expect(cell).toHaveAttribute('aria-pressed', 'true', { timeout: 2_000 });
	}).toPass();
	await expect.poll(() => committeeNations(page, E2E_SEAT_SR_ID)).toEqual(['deu', 'nld']);

	// the success toast offers to undo the click
	await page.getByRole('button', { name: /rückgängig|undo/i }).click();
	await expect(cell).toHaveAttribute('aria-pressed', 'false');
	await expect.poll(() => committeeNations(page, E2E_SEAT_SR_ID)).toEqual(['nld']);
});

test('a seat with an assigned delegate is locked in the matrix and on the server', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_SEAT_PM_ID), { startUrl: SEAT_PLANNING });

	// no toggle, but a lock naming the delegate
	await expect(page.getByRole('img', { name: /Niederlande: SPGV/ })).toBeVisible({
		timeout: 15_000
	});
	await expect(page.getByRole('button', { name: 'Niederlande: SPGV', exact: true })).toHaveCount(0);

	const { errors } = await graphql(
		page,
		`mutation { setCommitteeNationSeat(committeeId: "${E2E_SEAT_GV_ID}", nationAlpha3Code: "nld", enabled: false) { id } }`
	);
	// formatNames normalizes the casing of the name
	expect(errors?.[0].message.toLowerCase()).toContain(E2E_SEAT_DELEGATE_FAMILY_NAME.toLowerCase());
	expect(await committeeNations(page, E2E_SEAT_GV_ID)).toEqual(['deu', 'fra', 'nld']);
});

test('non-state actors are created, edited and deleted in the list', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_SEAT_PM_ID), { startUrl: `${SEAT_PLANNING}?tab=nsa` });

	const name = `E2E NSA ${Date.now()}`;
	const footer = page.locator('tfoot');
	await expect(footer.getByLabel('Name')).toBeVisible({ timeout: 15_000 });
	await expect(async () => {
		await footer.getByLabel('Name').fill(name);
		await footer.getByLabel('Kürzel').fill(`N${Date.now() % 10000}`);
		await footer.getByLabel('Beschreibung').fill('Created by the e2e suite');
		await footer.getByLabel('Plätze').fill('3');
		await footer.getByRole('button', { name: 'Hinzufügen' }).click();
		await expect(page.locator('tbody input[aria-label="Name"]').last()).toHaveValue(name, {
			timeout: 5_000
		});
	}).toPass();

	// ordered by creation: the seeded NSA first, the new one last (input values are properties,
	// not attributes, so rows cannot be found by an `input[value=...]` selector)
	const rows = page.locator('tbody tr');
	const row = rows.last();
	await row.getByLabel('Plätze').fill('4');
	await row.getByLabel('Plätze').blur();
	await expect(page.getByText('Gespeichert').first()).toBeVisible();

	// the NSA with an assigned delegation cannot be deleted
	const assignedRow = rows.first();
	await expect(assignedRow.getByLabel('Name')).toHaveValue(E2E_SEAT_ASSIGNED_NSA_NAME);
	await expect(assignedRow.getByRole('button', { name: 'Löschen' })).toBeDisabled();
	const { errors } = await graphql(
		page,
		`mutation { deleteNonStateActor(id: "${E2E_SEAT_ASSIGNED_NSA_ID}") }`
	);
	expect(errors?.length).toBeGreaterThan(0);

	await row.getByRole('button', { name: 'Löschen' }).click();
	await page
		.locator('.modal-open')
		.getByRole('button', { name: /löschen/i })
		.click();
	await expect(rows).toHaveCount(1);
});

test('a content lead only reaches the seat planning', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_SEAT_CONTENT_LEAD_ID), {
		startUrl: `${MANAGEMENT}/stats`
	});

	await page.waitForURL((url) => url.pathname === SEAT_PLANNING, { timeout: 15_000 });
	await page.goto(`${MANAGEMENT}/participants`);
	await page.waitForURL((url) => url.pathname === SEAT_PLANNING, { timeout: 15_000 });

	// the only management entry is the seat planning
	await expect(page.getByRole('listitem', { name: 'Sitzplanung', exact: true })).toBeVisible();
	await expect(page.locator(`a[href="${MANAGEMENT}/stats"]`)).toHaveCount(0);

	// may plan seats, but not change the committee set-up
	const seat = await graphql(
		page,
		`mutation { setCommitteeNationSeat(committeeId: "${E2E_SEAT_SR_ID}", nationAlpha3Code: "nld", enabled: true) { id } }`
	);
	expect(seat.errors).toBeUndefined();
	const committee = await graphql(
		page,
		`mutation { createCommittee(conferenceId: "${E2E_SEAT_CONFERENCE_ID}", name: "Forbidden", abbreviation: "NO", numOfSeatsPerDelegation: 1) { id } }`
	);
	expect(committee.errors?.length).toBeGreaterThan(0);
});

test('participant care cannot open the seat planning', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_SEAT_PARTICIPANT_CARE_ID), { startUrl: SEAT_PLANNING });

	await page.waitForURL((url) => url.pathname !== SEAT_PLANNING, { timeout: 15_000 });
	const seat = await graphql(
		page,
		`mutation { setCommitteeNationSeat(committeeId: "${E2E_SEAT_SR_ID}", nationAlpha3Code: "fra", enabled: true) { id } }`
	);
	expect(seat.errors?.length).toBeGreaterThan(0);
});

/** A committee's card on the configuration page, found by the heading that names it. */
function committeeCard(page: Page, heading: string) {
	return page
		.getByRole('heading', { name: heading, exact: true })
		.locator('xpath=ancestor::section[1]');
}

test('the project management adds and deletes a committee', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_SEAT_PM_ID), {
		startUrl: `${MANAGEMENT}/configuration?tab=committees`
	});

	// a committee with an assigned delegate cannot be deleted
	const gvCard = committeeCard(page, 'Generalversammlung (SPGV)');
	await expect(gvCard.getByRole('button', { name: /löschen/i })).toBeDisabled({ timeout: 15_000 });

	const abbreviation = `C${Date.now() % 100000}`;
	await expect(async () => {
		await page.getByRole('button', { name: /gremium hinzufügen/i }).click();
		await expect(page.locator('.modal-open')).toBeVisible({ timeout: 2_000 });
	}).toPass();
	const modal = page.locator('.modal-open');
	await modal.getByPlaceholder('Name').fill('E2E Committee');
	await modal.getByPlaceholder('Kürzel').fill(abbreviation);
	await modal.getByPlaceholder('Sitze pro Delegation').fill('2');
	await modal.getByRole('button', { name: /erstellen/i }).click();

	const card = committeeCard(page, `E2E Committee (${abbreviation})`);
	await expect(card).toBeVisible({ timeout: 15_000 });
	await expect(card.getByTitle('Sitze pro Delegation')).toHaveText('2');

	await card.getByRole('button', { name: /löschen/i }).click();
	await page
		.locator('.modal-open')
		.getByRole('button', { name: /löschen/i })
		.click();
	await expect(card).toHaveCount(0, { timeout: 15_000 });
});

test('every matrix column sorts, alphabetically by state by default', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_SEAT_PM_ID), { startUrl: SEAT_PLANNING });

	const firstState = page.locator('tbody tr').first().locator('th');
	await expect(firstState).toHaveText('Afghanistan', { timeout: 15_000 });

	// the fixture's Netherlands hold two seats, more than any other state
	await expect(async () => {
		await page.getByRole('button', { name: 'Σ' }).click();
		await expect(firstState).toHaveText('Niederlande', { timeout: 2_000 });
	}).toPass();
	await expect(page).toHaveURL(/sort=size/);

	// sorting by regional group mirrors the former grouped view: the African group comes first
	await page.getByRole('button', { name: /^Regionalgruppe/ }).click();
	await expect(firstState).toHaveText('Ägypten');
	await expect(page.locator('tbody tr').first().locator('td').first()).toHaveText('Afrika');

	// the seat planning sits at the top of the workflow group for the project management
	await page.getByText('Arbeitsabläufe').click();
	await expect(page.getByRole('listitem', { name: 'Sitzplanung', exact: true })).toBeVisible();
});

test('the regional baseline of a committee is set in the hints sidebar', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_SEAT_PM_ID), { startUrl: SEAT_PLANNING });

	await expect(async () => {
		await page.getByRole('button', { name: 'Vergleichsbasis' }).click();
		await expect(page.locator('.modal-open')).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 15_000 });
	const modal = page.locator('.modal-open');

	await modal.getByLabel('Vergleichsbasis SPSR').selectOption('SECURITY_COUNCIL');
	// the sidebar card of the committee names its new baseline
	await expect(
		page.locator('section', { hasText: 'SPSR' }).getByText('Sicherheitsrat')
	).toBeVisible();

	// manual targets start from the UN proportions and are saved on demand
	await modal.getByLabel('Vergleichsbasis SPSR').selectOption('MANUAL');
	await expect(modal.getByText('Manuelle Zielwerte · SPSR')).toBeVisible();
	await modal.getByRole('spinbutton').first().fill('1');
	await modal.getByRole('button', { name: /zielwerte übernehmen/i }).click();

	await expect
		.poll(async () => {
			const { data } = await graphql<{
				committee: { regionalBaseline: string; regionalBaselineTargets: number[] } | null;
			}>(
				page,
				`query { committee(id: "${E2E_SEAT_SR_ID}") { regionalBaseline regionalBaselineTargets } }`
			);
			return data?.committee;
		})
		.toMatchObject({ regionalBaseline: 'MANUAL', regionalBaselineTargets: [1, 0, 0, 0, 0] });

	// all-zero targets are refused by the server
	const { errors } = await graphql(
		page,
		`mutation { setCommitteeRegionalBaseline(committeeId: "${E2E_SEAT_SR_ID}", baseline: MANUAL, targets: [0, 0, 0, 0, 0]) { id } }`
	);
	expect(errors?.length).toBeGreaterThan(0);
});
