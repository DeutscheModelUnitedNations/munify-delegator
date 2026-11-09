import { AxeBuilder } from '@axe-core/playwright';
import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import {
	E2E_CONFERENCE_ID,
	E2E_PREP_CONFERENCE_ID,
	E2E_PREP_PARTICIPANT_USER_ID,
	E2E_SUPERVISOR_FOR_CONNECT_USER_ID
} from '../seed/seed';

// axe-core over the pages participants use, and the keyboard paths it cannot judge. The default
// DMUN look keeps its pale semantic colours (a design decision), so contrast is checked in the
// high contrast variant (`#lib/helpers/contrast`), which is the one that has to pass.

const PUBLIC_ROUTES = ['/', '/unsubscribe'];
const PARTICIPANT_ROUTES = ['', '/info', '/paperhub', '/payment', '/postal-registration'].map(
	(suffix) => `/dashboard/${E2E_PREP_CONFERENCE_ID}${suffix}`
);

/** The serious and critical WCAG 2.2 A/AA violations on the page, one line each. */
async function violations(page: Page, { contrast }: { contrast: boolean }) {
	const builder = new AxeBuilder({ page }).withTags([
		'wcag2a',
		'wcag2aa',
		'wcag21a',
		'wcag21aa',
		'wcag22aa'
	]);
	// What only `vite dev` mounts (E2E_SERVER=dev): the value inspector and the dev tools button
	builder.exclude('.inspect-panel').exclude('[data-dev-tools]');
	if (!contrast) builder.disableRules(['color-contrast']);
	const { violations } = await builder.analyze();
	return violations
		.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
		.flatMap((violation) =>
			violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`)
		);
}

async function scan(page: Page, paths: string[], { contrast }: { contrast: boolean }) {
	// Sections that fade in on scrolling are shown at once, as for anyone who asks for less motion
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const found: string[] = [];
	for (const path of paths) {
		await page.goto(path);
		await waitForHydration(page);
		// Skeletons stand in while a page's data loads; scan what is shown afterwards
		await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 15_000 });
		found.push(...(await violations(page, { contrast })).map((line) => `${path} ${line}`));
	}
	return found;
}

function highContrast(page: Page) {
	return page.addInitScript(() => localStorage.setItem('contrast', 'more'));
}

test.describe('public pages', () => {
	test('have no serious violations', async ({ page }) => {
		expect(await scan(page, PUBLIC_ROUTES, { contrast: false })).toEqual([]);
	});

	test('pass contrast in high contrast', async ({ page }) => {
		await highContrast(page);
		expect(await scan(page, PUBLIC_ROUTES, { contrast: true })).toEqual([]);
	});
});

test.describe('participant dashboard', () => {
	test.setTimeout(180_000);

	test.beforeEach(async ({ page }) => {
		await loginAs(page, fixedTestUser(E2E_PREP_PARTICIPANT_USER_ID), {
			startUrl: `/dashboard/${E2E_PREP_CONFERENCE_ID}`
		});
	});

	test('has no serious violations', async ({ page }) => {
		expect(await scan(page, PARTICIPANT_ROUTES, { contrast: false })).toEqual([]);
	});

	test('passes contrast in high contrast', async ({ page }) => {
		await highContrast(page);
		expect(await scan(page, PARTICIPANT_ROUTES, { contrast: true })).toEqual([]);
	});
});

test('the first Tab reaches the skip link, which moves on to the content', async ({ page }) => {
	await page.goto('/');
	await waitForHydration(page);
	await page.keyboard.press('Tab');
	const skip = page.getByRole('link', { name: /zum inhalt springen|skip to content/i });
	await expect(skip).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.locator('main#main-content')).toBeFocused();
});

test('the high contrast toggle applies at once and stays chosen', async ({ page }) => {
	await page.goto('/');
	await waitForHydration(page);
	const toggle = page.getByRole('button', { name: /hoher kontrast|high contrast/i });
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
	await page.reload();
	// Set before the first paint, by the script in app.html
	await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
});

test('the language buttons are named in their own language', async ({ page }) => {
	await page.goto('/');
	await waitForHydration(page);
	await expect(page.getByRole('button', { name: 'Deutsch' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('lang', 'en');
});

test('a dialog takes the focus, keeps it, and hands it back on Escape', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_SUPERVISOR_FOR_CONNECT_USER_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}`
	});
	const opener = page.getByRole('button', { name: /schule ändern|change school/i });
	await opener.click();
	const dialog = page.getByRole('dialog', { name: /schule ändern|change school/i });
	await expect(dialog).toBeVisible();
	await expect(dialog.locator(':focus')).toHaveCount(1);
	// However far Tab goes, it stays inside
	for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
	await expect(dialog.locator(':focus')).toHaveCount(1);
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(opener).toBeFocused();
});
