import { AxeBuilder } from '@axe-core/playwright';
import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { announcementsFixture } from '../seed/announcements';

// The announcements as people use them: the feed each reader gets, reading, the team's list and
// editor with its audience count, publishing right away (an urgent one reaches open pages as a
// bar) and at a time, editing, taking back, duplicating, archiving and deleting. The specs build
// on each other's announcements, so they run in order; the fixture (e2e/seed/announcements.ts)
// starts every run with the same seven. Who may read and change what is
// e2e/authorization/announcements.spec.ts.
// Several people sign in per test, each through the provider once.
test.describe.configure({ mode: 'serial', timeout: 90_000 });

const fixture = announcementsFixture('ui');
const DASHBOARD = `/dashboard/${fixture.conferenceId}`;
const FEED = `${DASHBOARD}/announcements`;
const TEAM = `${DASHBOARD}/team/announcement`;
const { anna, bert, supervisor, waiting, outsider, care, member } = fixture.people;
const titles = fixture.announcements;

const URGENT = 'Der Shuttlebus fällt heute aus';

/** The extra people's browsers of the running test, closed when it ends. */
const opened: import('@playwright/test').BrowserContext[] = [];

async function signedIn(
	browser: import('@playwright/test').Browser,
	{ id, startUrl }: { id: string; startUrl: string }
) {
	const context = await browser.newContext();
	opened.push(context);
	const page = await context.newPage();
	await loginAs(page, fixedTestUser(id, fixture.claims(id)), { startUrl });
	return page;
}

// Every open page holds its live queries' connections to the server. Left open, the pages of the
// earlier tests pile up until a later one no longer gets its answers.
test.afterEach(async () => {
	await Promise.all(opened.splice(0).map((context) => context.close()));
});

const cards = (page: Page) => page.getByTestId('announcement-card');
const card = (page: Page, title: string) => cards(page).filter({ hasText: title });
const rows = (page: Page) => page.getByTestId('announcement-row');
const row = (page: Page, title: string) =>
	rows(page).filter({ has: page.getByRole('heading', { name: title, exact: true }) });

/** The titles of the announcements on the reader's announcements page, in order. */
async function feedTitles(page: Page) {
	await expect(
		page.getByTestId('announcement-feed').or(page.getByTestId('announcement-feed-empty'))
	).toBeVisible();
	return cards(page).getByRole('heading').allTextContents();
}

test('a delegate finds on the dashboard what is for them, pinned first, and marks it read', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(anna.id, fixture.claims(anna.id)), { startUrl: DASHBOARD });
	const feed = page.getByTestId('announcement-feed');
	await expect(feed).toBeVisible();

	// everybody's and her committee's; not the supervisors', the team's, a draft, a scheduled or
	// an expired one
	await expect(cards(page)).toHaveCount(2);
	await expect(cards(page).nth(0)).toContainText(titles.welcome.title);
	await expect(cards(page).nth(0)).toContainText('Angeheftet');
	await expect(cards(page).nth(0)).toContainText('Euer Team der Teilnehmendenbetreuung');
	await expect(cards(page).nth(1)).toContainText(titles.gv.title);
	await expect(cards(page).nth(1)).toContainText('Wichtig');
	for (const hidden of [
		titles.supervisors,
		titles.team,
		titles.draft,
		titles.scheduled,
		titles.expired
	])
		await expect(feed).not.toContainText(hidden.title);

	const unread = page.getByTestId('announcement-unread-count');
	await expect(unread).toHaveText('2 ungelesen');
	await card(page, titles.gv.title).getByRole('button', { name: 'Als gelesen markieren' }).click();
	await expect(unread).toHaveText('1 ungelesen');
	await expect(card(page, titles.gv.title)).not.toContainText('Neu');

	// what was read stays read
	await page.reload();
	await expect(page.getByTestId('announcement-unread-count')).toHaveText('1 ungelesen');
	await expect(card(page, titles.welcome.title)).toContainText('Neu');
});

test('everybody gets their own feed, and somebody without a part none', async ({ browser }) => {
	const feedOf = async (id: string) => feedTitles(await signedIn(browser, { id, startUrl: FEED }));

	expect(await feedOf(bert.id)).toEqual([titles.welcome.title]);
	// the seats are released: "everyone" is whoever holds one. A supervisor without a seated
	// student and somebody still waiting only get what names them
	expect(await feedOf(supervisor.id)).toEqual([titles.supervisors.title]);
	expect(await feedOf(waiting.id)).toEqual([]);
	// the team is in no participant audience, only in its own
	expect(await feedOf(member.id)).toEqual([titles.team.title]);

	const nobody = await signedIn(browser, { id: outsider.id, startUrl: FEED });
	await expect(nobody.getByTestId('announcement-feed-empty')).toHaveText(
		'Für dich gibt es gerade keine Ankündigungen.'
	);
});

test('the team lists every announcement with its state and how many it reaches', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(care.id, fixture.claims(care.id)), { startUrl: TEAM });
	await expect(rows(page)).toHaveCount(7);

	const stateOf = (title: string) => row(page, title).getByTestId('announcement-state');
	await expect(stateOf(titles.welcome.title)).toHaveText('Veröffentlicht');
	await expect(stateOf(titles.draft.title)).toHaveText('Entwurf');
	await expect(stateOf(titles.scheduled.title)).toHaveText('Geplant');
	await expect(stateOf(titles.expired.title)).toHaveText('Abgelaufen');

	// Anna, Bert and Carla, who hold seats; Anna read none of it but the GV one
	await expect(row(page, titles.welcome.title).getByTestId('announcement-reach')).toHaveText(
		'gelesen von 0 von 3'
	);
	await expect(row(page, titles.gv.title).getByTestId('announcement-reach')).toHaveText(
		'gelesen von 1 von 2'
	);
	await expect(row(page, titles.gv.title)).toContainText(`Gremium: ${fixture.gv}`);
	await expect(row(page, titles.team.title).getByTestId('announcement-reach')).toHaveText(
		'gelesen von 0 von 3'
	);
	await expect(row(page, titles.welcome.title)).toContainText('verfasst von Cora Care');
});

test('the editor refuses an empty announcement and counts the audience as it is picked', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(care.id, fixture.claims(care.id)), { startUrl: TEAM });
	await page.getByTestId('announcement-new').click();
	const editor = page.getByTestId('announcement-editor');
	await expect(editor).toBeVisible();

	// nothing written, nobody chosen
	await page.getByTestId('announcement-save').click();
	await expect(editor).toContainText('Die Ankündigung braucht einen Titel.');
	await expect(editor).toContainText('Die Ankündigung braucht einen Text.');
	await expect(editor).toContainText('Wähle mindestens eine Zielgruppe.');
	await expect(page.getByTestId('announcement-save')).toBeDisabled();

	await page.getByTestId('announcement-title').fill(URGENT);
	await page.getByTestId('announcement-body').fill('Bitte nehmt die **Linie 4** ab Hauptbahnhof.');
	await page.getByTestId('announcement-signature').fill('Eure Orga');
	// the preview shows it as readers will get it
	await expect(editor.getByTestId('announcement-card')).toContainText('Linie 4');
	await expect(editor.getByTestId('announcement-card')).toContainText('Eure Orga');

	const count = page.getByTestId('audience-count');
	await page
		.getByTestId('audience-add-committee')
		.selectOption({ label: `${fixture.sr} · Sicherheitsrat` });
	await expect(count).toContainText('Erreicht derzeit 1 Personen');
	await page.getByTestId('audience-add-group').selectOption({ label: 'Betreuende' });
	await expect(count).toContainText('Erreicht derzeit 2 Personen');
	await expect(count).toContainText('1 Delegierte, 1 Betreuende');
	// a block is taken away again
	await page.getByRole('button', { name: 'Betreuende entfernen' }).click();
	await expect(count).toContainText('Erreicht derzeit 1 Personen');
	await page.getByTestId('audience-add-group').selectOption({ label: 'Betreuende' });

	await page.getByTestId('announcement-importance').selectOption('URGENT');
	await page.getByTestId('announcement-save').click();
	await expect(editor).toBeHidden();

	await expect(row(page, URGENT).getByTestId('announcement-state')).toHaveText('Entwurf');
	await expect(row(page, URGENT)).toContainText('Dringend');
	await expect(row(page, URGENT)).toContainText(`Gremium: ${fixture.sr}`);
});

test('an urgent announcement reaches its audience at once, as a bar on every page, until read', async ({
	browser
}) => {
	// Bert sits in the SR and has his dashboard open; Anna does not
	const bertPage = await signedIn(browser, { id: bert.id, startUrl: DASHBOARD });
	const bar = bertPage.getByTestId('urgent-announcement-bar');
	await expect(cards(bertPage)).toHaveCount(1);
	await expect(bar).toBeHidden();

	const carePage = await signedIn(browser, { id: care.id, startUrl: TEAM });
	await row(carePage, URGENT).getByTestId('announcement-publish').click();
	const dialog = carePage.getByTestId('publish-dialog');
	await expect(dialog.getByTestId('publish-recipients')).toContainText(
		'Die Ankündigung erreicht derzeit 2 Personen.'
	);
	await expect(dialog).toContainText('Es wird keine E-Mail verschickt.');
	await carePage.getByTestId('publish-confirm').click();
	await expect(row(carePage, URGENT).getByTestId('announcement-state')).toHaveText(
		'Veröffentlicht'
	);

	// live, without a reload
	await expect(bar).toContainText(URGENT);
	await expect(card(bertPage, URGENT)).toContainText('Linie 4');

	// the bar follows him to other pages and leads to the announcement
	await bertPage.goto(`${DASHBOARD}/payment`);
	await expect(bertPage.getByTestId('urgent-announcement-bar')).toContainText(URGENT);
	await bertPage
		.getByTestId('urgent-announcement-bar')
		.getByRole('link', { name: 'Lesen' })
		.click();
	await expect(bertPage).toHaveURL(/\/announcements#announcement-/);
	await expect(card(bertPage, URGENT)).toBeVisible();

	// the pages cross-fade after a navigation, and a click landing in the fade is lost
	const shown = bertPage.getByTestId('urgent-announcement-bar');
	await expect(async () => {
		if (await shown.isVisible())
			await shown
				.getByRole('button', { name: 'Als gelesen markieren und ausblenden' })
				.click({ timeout: 2000 });
		await expect(shown).toBeHidden({ timeout: 2000 });
	}).toPass();
	await expect(card(bertPage, URGENT)).not.toContainText('Neu');

	const annaPage = await signedIn(browser, { id: anna.id, startUrl: FEED });
	expect(await feedTitles(annaPage)).not.toContain(URGENT);
	await expect(annaPage.getByTestId('urgent-announcement-bar')).toBeHidden();
});

test('a scheduled announcement stays hidden until its time', async ({ browser }) => {
	const carePage = await signedIn(browser, { id: care.id, startUrl: TEAM });
	await row(carePage, titles.draft.title).getByTestId('announcement-publish').click();
	const dialog = carePage.getByTestId('publish-dialog');
	await dialog.getByLabel('Zu einem späteren Zeitpunkt').check();
	// no time yet, or one that is over, cannot be scheduled
	await expect(carePage.getByTestId('publish-confirm')).toBeDisabled();
	await dialog.getByLabel('Zeitpunkt der Veröffentlichung').fill('2020-01-01T10:00');
	await expect(carePage.getByTestId('publish-confirm')).toBeDisabled();
	await dialog.getByLabel('Zeitpunkt der Veröffentlichung').fill('2099-01-01T10:00');
	await expect(carePage.getByTestId('publish-confirm')).toHaveText(/Veröffentlichung planen/);
	await carePage.getByTestId('publish-confirm').click();

	const scheduled = row(carePage, titles.draft.title);
	await expect(scheduled.getByTestId('announcement-state')).toHaveText('Geplant');
	await expect(scheduled).toContainText('geplant für');

	const annaPage = await signedIn(browser, { id: anna.id, startUrl: FEED });
	expect(await feedTitles(annaPage)).not.toContain(titles.draft.title);
});

test('a change to a published announcement shows as an update, and taking it back removes it', async ({
	browser
}) => {
	const annaPage = await signedIn(browser, { id: anna.id, startUrl: FEED });
	await expect(card(annaPage, titles.gv.title)).toBeVisible();

	const carePage = await signedIn(browser, { id: care.id, startUrl: TEAM });
	await row(carePage, titles.gv.title).getByTestId('announcement-edit').click();
	await carePage
		.getByTestId('announcement-body')
		.fill('Die Generalversammlung tagt ab morgen im **Audimax**.');
	await carePage.getByTestId('announcement-save').click();
	await expect(carePage.getByTestId('announcement-editor')).toBeHidden();
	await expect(row(carePage, titles.gv.title)).toContainText('aktualisiert am');

	// live for the reader
	await expect(card(annaPage, titles.gv.title)).toContainText('Audimax');
	await expect(card(annaPage, titles.gv.title)).toContainText('aktualisiert am');

	await row(carePage, titles.gv.title).getByTestId('announcement-withdraw').click();
	await expect(row(carePage, titles.gv.title).getByTestId('announcement-state')).toHaveText(
		'Entwurf'
	);
	await expect(card(annaPage, titles.gv.title)).toBeHidden();
});

test('an announcement is duplicated as a draft, archived and deleted', async ({ page }) => {
	await loginAs(page, fixedTestUser(care.id, fixture.claims(care.id)), { startUrl: TEAM });
	const copy = `${titles.welcome.title} (Kopie)`;
	const before = await rows(page).count();

	await row(page, titles.welcome.title).getByTestId('announcement-duplicate').click();
	await expect(rows(page)).toHaveCount(before + 1);
	await expect(row(page, copy).getByTestId('announcement-state')).toHaveText('Entwurf');
	// the copy keeps the audience
	await expect(row(page, copy)).toContainText('Alle Teilnehmenden');

	await row(page, copy).getByTestId('announcement-archive').click();
	await expect(row(page, copy).getByTestId('announcement-state')).toHaveText('Archiviert');

	page.once('dialog', (dialog) => dialog.accept());
	await row(page, copy).getByTestId('announcement-delete').click();
	await expect(rows(page)).toHaveCount(before);
	await expect(row(page, copy)).toHaveCount(0);
});

test('a team member without a content role reads the team feed but cannot open the editor', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(member.id, fixture.claims(member.id)), { startUrl: DASHBOARD });
	await expect(card(page, titles.team.title)).toBeVisible();
	// the team guard answers a page the role may not open with a 403
	const response = await page.goto(TEAM);
	expect(response?.status()).toBe(403);
});

test('the announcements have no serious accessibility violations in high contrast', async ({
	page
}) => {
	await page.addInitScript(() => localStorage.setItem('contrast', 'more'));
	await loginAs(page, fixedTestUser(supervisor.id, fixture.claims(supervisor.id)), {
		startUrl: FEED
	});
	await expect(cards(page).first()).toBeVisible();

	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		// what only `vite dev` mounts (E2E_SERVER=dev)
		.exclude('.inspect-panel')
		.exclude('[data-dev-tools]')
		.analyze();
	expect(
		violations
			.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
			.flatMap((violation) =>
				violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`)
			)
	).toEqual([]);
});
