import { test, expect } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_ASSIGNMENT_ADMIN_ID, E2E_CONFERENCE_ID } from '../seed/seed';

// The sighting shows one application at a time, like a deck of cards: the team turns through it
// with the buttons, the arrow keys or the strip of the whole deck, rating as they go.
test('the sighting turns through the applications one card at a time', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/management/assignment/sighting`
	});

	const position = page.getByTestId('deck-position');
	await expect(position).toHaveText(/^1 (von|of) \d+$/);
	const heading = page.locator('h3').filter({ has: page.locator('i.fa-users, i.fa-user') });
	await expect(heading).toHaveCount(1);
	const first = await heading.innerText();

	await page
		.getByRole('button', { name: /^(weiter|next)\b/i })
		.first()
		.click();
	await expect(position).toHaveText(/^2 (von|of) \d+$/);
	await expect(heading).not.toHaveText(first);

	await page.keyboard.press('ArrowLeft');
	await expect(position).toHaveText(/^1 (von|of) \d+$/);
	await expect(heading).toHaveText(first);

	await page.keyboard.press('ArrowRight');
	await expect(position).toHaveText(/^2 (von|of) \d+$/);

	// The strip jumps to any card, and the position survives a reload.
	await page
		.getByRole('list', { name: /überblick|glance/i })
		.getByRole('button')
		.nth(3)
		.click();
	await expect(position).toHaveText(/^4 (von|of) \d+$/);
	await page.reload();
	await waitForHydration(page);
	await expect(position).toHaveText(/^4 (von|of) \d+$/);
});

// Ratings, exclusions and notes live in the database, not in the browser: they come back after a
// reload and colour the card in the strip of the deck.
test('the sighting keeps ratings, exclusions and notes on the server', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/management/assignment/sighting?application=`
	});
	const strip = page.getByRole('list', { name: /überblick|glance/i }).getByRole('button');
	await expect(strip.first()).toHaveClass(/bg-base-300/);

	await page.getByRole('button', { name: /ausschließen|exclude|disqualif/i }).click();
	await expect(strip.first()).toHaveClass(/bg-error/);

	const note = page.getByRole('textbox', { name: /notiz|note/i });
	await note.fill('e2e note');
	await note.blur();
	await expect(note).toHaveValue('e2e note');

	await page.reload();
	await waitForHydration(page);
	await expect(strip.first()).toHaveClass(/bg-error/);
	await expect(page.getByRole('textbox', { name: /notiz|note/i })).toHaveValue('e2e note');

	// Undo, so the shared seed stays as it was.
	await page.getByRole('button', { name: /ausschließen|exclude|disqualif/i }).click();
	await expect(strip.first()).toHaveClass(/bg-base-300/);
	await page.getByRole('textbox', { name: /notiz|note/i }).fill('');
	await page.getByRole('textbox', { name: /notiz|note/i }).blur();
});

// The deck, its filters, the slider and the search are the backend's: only a window of the deck
// and the card on top are ever loaded.
test('the sighting seeks, filters and searches in the backend', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/management/assignment/sighting`
	});
	const position = page.getByTestId('deck-position');
	await expect(position).toHaveText(/^1 (von|of) \d+$/);
	const heading = page.locator('h3').filter({ has: page.locator('i.fa-users, i.fa-user') });
	const first = await heading.innerText();

	// the slider seeks to a place in the deck
	await page.getByRole('slider').fill('3');
	await expect(position).toHaveText(/^3 (von|of) \d+$/);
	await expect(heading).not.toHaveText(first);

	// a status filter narrows the deck: nothing is flagged in the seed
	await page.getByLabel(/status/i).selectOption('flagged');
	await expect(page.getByText(/keine|no applications/i).first()).toBeVisible();
	await page.getByLabel(/status/i).selectOption('all');
	await expect(position).toHaveText(/^\d+ (von|of) \d+$/);

	// the codename finds the application, and picking it brings it back to the deck
	const name = await heading.innerText();
	await page.getByRole('searchbox').first().fill(name.trim().slice(0, 12));
	const results = page.getByTestId('search-count');
	await expect(results).toBeVisible({ timeout: 15_000 });
	await page.getByRole('searchbox').first().press('Enter');
	await expect(heading).toHaveText(name);

	expect(errors, 'no uncaught browser errors').toEqual([]);
});
