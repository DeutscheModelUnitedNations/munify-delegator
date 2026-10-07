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
