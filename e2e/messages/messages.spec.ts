import { AxeBuilder } from '@axe-core/playwright';
import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { messagesFixture } from '../seed/messages';

// The chats as people use them: finding somebody by country and committee, writing, the dashboard
// card, the team inboxes, "write to delegate" on a paper, reporting, and handing out committee
// functions. The specs build on each other's chats, so they run in order; the fixture
// (e2e/seed/messages.ts) starts every run without any. Who may read what is
// e2e/authorization/messages.spec.ts.
// Several people sign in per test, each through the provider once.
test.describe.configure({ mode: 'serial', timeout: 90_000 });

const fixture = messagesFixture('ui');
const DASHBOARD = `/dashboard/${fixture.conferenceId}`;
const MESSAGES = `${DASHBOARD}/messages`;
const TEAM_MESSAGES = `${DASHBOARD}/team/messages`;
const { anna, carla } = fixture.delegates;
const { care, reviewer, management, member, tessa, theo } = fixture.team;

async function signedIn(
	browser: import('@playwright/test').Browser,
	{ id, startUrl }: { id: string; startUrl: string }
) {
	const page = await (await browser.newContext()).newPage();
	await loginAs(page, fixedTestUser(id, fixture.claims(id)), { startUrl });
	return page;
}

/** Writes a message as somebody who has agreed to the terms: it just goes. */
async function write(page: Page, text: string) {
	await page.getByTestId('chat-input').fill(text);
	await page.getByTestId('chat-send').click();
	await expect(page.getByTestId('chat-message').filter({ hasText: text })).toBeVisible();
	await expect(page.getByTestId('chat-input')).toHaveValue('');
}

/** A chip narrowing the team's chat list to one of the inboxes the caller answers. */
const inboxChip = (page: Page, name: string) =>
	page.getByRole('group', { name: 'Postfächer' }).getByRole('button', { name });

const openChat = (page: Page, title: string | RegExp) =>
	page.getByTestId('chat-list').getByRole('button', { name: title }).click();

test('a delegate finds another by country and committee and writes to them', async ({ page }) => {
	await loginAs(page, fixedTestUser(anna.id, fixture.claims(anna.id)), { startUrl: MESSAGES });
	await expect(page.getByText('Du hast noch keine Chats.')).toBeVisible();

	await page.getByTestId('chat-new').click();
	const search = page.getByTestId('chat-contact-search');
	const found = page.getByTestId('chat-contact');
	// everybody seated but herself
	await expect(found).toHaveCount(3);

	await search.fill('atlantis');
	await expect(page.getByText('Nichts gefunden.')).toBeVisible();

	// every word narrows: the country, then the committee
	await search.fill('frank');
	await expect(found).toHaveCount(2);
	await search.fill('frank msgv');
	await expect(found).toHaveCount(1);
	await expect(found).toContainText('Frankreich');
	await found.click();

	await expect(page.getByTestId('chat-title')).toHaveText('Frankreich · MSGV');
	await expect(page).toHaveURL(/chat=/);

	// her first message ever: the terms of the message service come first
	await page.getByTestId('chat-input').fill('Hallo aus Deutschland');
	await page.getByTestId('chat-send').click();
	const terms = page.getByRole('dialog', { name: 'Nutzungsbedingungen der Nachrichten' });
	await expect(terms).toContainText('Wer deine Nachrichten lesen kann');
	await expect(terms).toContainText('Vertrauenspersonen');
	await expect(page.getByTestId('chat-message')).toHaveCount(0);
	// nothing goes out without her agreement, and her text is kept
	await expect(page.getByTestId('chat-terms-accept')).toBeDisabled();
	await terms.getByRole('button', { name: 'Abbruch' }).click();
	await expect(page.getByTestId('chat-input')).toHaveValue('Hallo aus Deutschland');
	await expect(page.getByTestId('chat-message')).toHaveCount(0);

	await page.getByTestId('chat-send').click();
	await page.getByTestId('chat-terms-agree').check();
	await page.getByTestId('chat-terms-accept').click();
	await expect(
		page.getByTestId('chat-message').filter({ hasText: 'Hallo aus Deutschland' })
	).toBeVisible();
	await expect(terms).toBeHidden();

	// and they stay there to read
	await page.getByTestId('chat-terms-read').click();
	await expect(terms).toContainText('Respektvoller Umgang');
	await expect(page.getByTestId('chat-terms-agree')).toHaveCount(0);
	await terms.getByRole('button', { name: 'Schließen' }).first().click();
	await expect(page.getByTestId('chat-list')).toContainText('Frankreich · MSGV');
});

test('the other delegate sees it on the dashboard by role, and both follow the chat live', async ({
	browser
}) => {
	const carlaPage = await signedIn(browser, { id: carla.id, startUrl: DASHBOARD });
	const card = carlaPage.getByTestId('messages-link-unread');
	await expect(card).toContainText('1 ungelesen');
	await expect(card).toContainText('Deutschland · MSGV');
	await expect(card).toContainText('Hallo aus Deutschland');

	// the header says so on every page of the conference, and leads to the chats
	const header = carlaPage.getByTestId('header-unread-messages');
	await expect(header).toHaveAccessibleName('Nachrichten: 1 ungelesen');
	await header.click();
	await openChat(carlaPage, /Deutschland · MSGV/);
	await expect(carlaPage.getByTestId('chat-message')).toContainText(['Hallo aus Deutschland']);
	// a line marks where she left off, and stays although opening the chat read it
	const divider = carlaPage.getByTestId('chat-unread-divider');
	await expect(divider).toHaveText('Neue Nachrichten');
	// participants know each other by role: Anna's name is nowhere on the page
	await expect(carlaPage.locator('body')).not.toContainText(anna.family);
	// reading clears the unread count
	await expect(carlaPage.getByTestId('chat-list').locator('.badge-primary')).toHaveCount(0);

	const annaPage = await signedIn(browser, { id: anna.id, startUrl: MESSAGES });
	await openChat(annaPage, /Frankreich · MSGV/);
	// she has read everything in it: no line
	await expect(annaPage.getByTestId('chat-message')).toHaveCount(1);
	await expect(annaPage.getByTestId('chat-unread-divider')).toHaveCount(0);
	await write(carlaPage, 'Hallo aus Frankreich');
	await expect(divider).toBeVisible();
	// opened again with nothing new, the line is gone
	await carlaPage.reload();
	await expect(carlaPage.getByTestId('chat-message')).toHaveCount(2);
	await expect(divider).toHaveCount(0);
	// arrives without a reload
	await expect(
		annaPage.getByTestId('chat-message').filter({ hasText: 'Hallo aus Frankreich' })
	).toBeVisible();
});

test('a question to a team inbox is answered under the function and name', async ({ browser }) => {
	const annaPage = await signedIn(browser, { id: anna.id, startUrl: MESSAGES });
	await annaPage.getByTestId('chat-new').click();
	await annaPage
		.getByTestId('chat-inbox-option')
		.filter({ hasText: 'Gremienberatung · MSGV' })
		.click();
	await expect(annaPage.getByTestId('chat-title')).toHaveText('Gremienberatung · MSGV');
	await write(annaPage, 'Wie lang darf das Positionspapier sein?');

	const reviewerPage = await signedIn(browser, { id: reviewer.id, startUrl: TEAM_MESSAGES });
	await openChat(reviewerPage, /Deutschland · MSGV/);
	await expect(reviewerPage.getByTestId('chat-message')).toContainText([
		'Wie lang darf das Positionspapier sein?'
	]);
	await write(reviewerPage, 'Eine Seite reicht.');

	const answer = annaPage.getByTestId('chat-message').filter({ hasText: 'Eine Seite reicht.' });
	await expect(answer).toBeVisible();
	await expect(answer).toContainText(
		`Gremienberatung · MSGV · ${reviewer.given} ${reviewer.family}`
	);
});

test('a reviewer writes to a paper’s author from the paper', async ({ browser }) => {
	const reviewerPage = await signedIn(browser, {
		id: reviewer.id,
		startUrl: `${DASHBOARD}/paperhub/${fixture.paperId}`
	});
	await reviewerPage.getByTestId('write-to-delegate').click();

	// the reviewer answers one inbox reaching Anna, so the chat opens right away
	await expect(reviewerPage).toHaveURL(/team\/messages\?.*paper=/);
	await expect(reviewerPage.getByTestId('chat-title')).toHaveText('Deutschland · MSGV');
	await expect(
		reviewerPage.getByText('Deine nächste Nachricht verweist auf das Papier.')
	).toBeVisible();
	await write(reviewerPage, 'Bitte ergänze noch Quellen.');
	const message = reviewerPage
		.getByTestId('chat-message')
		.filter({ hasText: 'Bitte ergänze noch Quellen.' });
	await expect(message.getByRole('link', { name: 'Zum Papier' })).toHaveAttribute(
		'href',
		new RegExp(`/paperhub/${fixture.paperId}$`)
	);
	// the next message is about nothing in particular again
	await expect(reviewerPage).not.toHaveURL(/paper=/);
});

test('a reported chat reaches participant care, who can suspend and settle it', async ({
	browser
}) => {
	const carlaPage = await signedIn(browser, { id: carla.id, startUrl: MESSAGES });
	await openChat(carlaPage, /Deutschland · MSGV/);
	await carlaPage.getByTestId('chat-menu').click();
	await carlaPage.getByTestId('chat-report').click();
	// an empty report cannot be sent
	await expect(carlaPage.getByTestId('chat-report-submit')).toBeDisabled();
	await carlaPage.getByTestId('chat-report-reason').fill('Bitte schaut euch das an.');
	await carlaPage.getByTestId('chat-report-submit').click();
	await expect(carlaPage.getByText('Gemeldet. Die Teilnehmendenbetreuung')).toBeVisible();

	const carePage = await signedIn(browser, { id: care.id, startUrl: TEAM_MESSAGES });
	await carePage.getByRole('tab', { name: 'Meldungen (1)' }).click();
	const report = carePage.getByTestId('chat-reports').getByRole('listitem');
	await expect(report).toContainText('Bitte schaut euch das an.');
	await expect(report).toContainText(`Gemeldet von ${carla.given} ${carla.family}`);
	await carePage.getByTestId('chat-report-open').click();

	// participant care reads along, with the names, and cannot write
	const thread = carePage.getByTestId('chat-thread');
	await expect(thread).toContainText('Du liest diesen Chat, weil er gemeldet wurde.');
	await expect(thread).toContainText(`${anna.given} ${anna.family}`);
	await expect(thread.getByTestId('chat-message')).toContainText(['Hallo aus Deutschland']);
	await expect(carePage.getByTestId('chat-input')).toHaveCount(0);
	await expect(carePage.getByTestId('chat-refusal')).toBeVisible();

	// suspending Germany's delegate closes her chats with other participants
	const suspendAnna = thread
		.getByRole('listitem')
		.filter({ hasText: 'Deutschland · MSGV' })
		.getByTestId('chat-suspend');
	await suspendAnna.click();
	await expect(suspendAnna).toHaveText('Sperre aufheben');
	const annaPage = await signedIn(browser, { id: anna.id, startUrl: MESSAGES });
	await openChat(annaPage, /Frankreich · MSGV/);
	await expect(annaPage.getByTestId('chat-refusal')).toContainText('gesperrt');
	// the team is still hers to write to
	await openChat(annaPage, /Gremienberatung · MSGV/);
	await expect(annaPage.getByTestId('chat-input')).toBeVisible();

	await suspendAnna.click();
	await expect(suspendAnna).toHaveText('Für Chats sperren');
	await carePage.getByTestId('chat-report-resolve').click();
	await expect(carePage.getByTestId('chat-no-reports')).toBeVisible();
});

test('project management hands out a committee function, which opens an inbox', async ({
	browser
}) => {
	const memberPage = await signedIn(browser, { id: member.id, startUrl: TEAM_MESSAGES });
	await expect(memberPage.getByText('Du betreust noch kein Postfach.')).toBeVisible();

	const managementPage = await signedIn(browser, {
		id: management.id,
		startUrl: `${DASHBOARD}/team/members`
	});
	await managementPage
		.getByRole('row')
		.filter({ hasText: `${member.id}@e2e.test` })
		.getByTestId('team-functions-open')
		.click();
	const functions = managementPage.getByTestId('team-functions');
	const chairOfSr = functions.getByRole('checkbox', { name: 'Vorsitz · MSSR' });
	await expect(chairOfSr).not.toBeChecked();
	await chairOfSr.check();
	// saved: it is still set after the dialog was closed and opened again
	await managementPage.getByRole('button', { name: 'Schließen', exact: true }).click();
	await managementPage
		.getByRole('row')
		.filter({ hasText: `${member.id}@e2e.test` })
		.getByTestId('team-functions-open')
		.click();
	await expect(functions.getByRole('checkbox', { name: 'Vorsitz · MSSR' })).toBeChecked();

	// the member now answers an inbox (still empty)
	await expect(memberPage.getByText('Du betreust noch kein Postfach.')).toHaveCount(0);
	await expect(memberPage.getByTestId('chat-workspace')).toBeVisible();
	await expect(
		memberPage.getByText('In diesem Postfach ist noch nichts angekommen.')
	).toBeVisible();

	await functions.getByRole('checkbox', { name: 'Vorsitz · MSSR' }).uncheck();
	await expect(memberPage.getByText('Du betreust noch kein Postfach.')).toBeVisible();
});

test('a participant writes to one trusted person in confidence', async ({ browser }) => {
	const carlaPage = await signedIn(browser, { id: carla.id, startUrl: MESSAGES });
	await carlaPage.getByTestId('chat-new').click();
	const options = carlaPage.getByTestId('chat-inbox-option');
	// all of them together, and each by name
	await expect(options.filter({ hasText: 'Vertrauenspersonen' })).toHaveCount(1);
	await expect(
		options.filter({ hasText: `Vertrauensperson · ${theo.given} ${theo.family}` })
	).toHaveCount(1);
	const tessaName = `${tessa.given} ${tessa.family}`;
	await options.filter({ hasText: `Vertrauensperson · ${tessaName}` }).click();
	await expect(carlaPage.getByTestId('chat-title')).toHaveText(`Vertrauensperson · ${tessaName}`);
	await expect(carlaPage.getByTestId('chat-thread')).toContainText(
		`Vertraulich: Nur ${tessaName} liest diesen Chat`
	);
	await write(carlaPage, 'Ich brauche jemanden zum Reden.');

	// Tessa finds it under "to me personally", Theo does not
	const tessaPage = await signedIn(browser, { id: tessa.id, startUrl: TEAM_MESSAGES });
	await inboxChip(tessaPage, 'An mich persönlich').click();
	await openChat(tessaPage, /Frankreich · MSGV/);
	await expect(tessaPage.getByTestId('chat-message')).toContainText([
		'Ich brauche jemanden zum Reden.'
	]);
	await write(tessaPage, 'Ich bin da. Wann passt es dir?');
	const answer = carlaPage.getByTestId('chat-message').filter({ hasText: 'Ich bin da.' });
	await expect(answer).toContainText(`Vertrauensperson · ${tessaName}`);

	const theoPage = await signedIn(browser, { id: theo.id, startUrl: TEAM_MESSAGES });
	await expect(theoPage.getByTestId('chat-workspace')).toBeVisible();
	await expect(theoPage.getByText('In diesem Postfach ist noch nichts angekommen.')).toBeVisible();
});

test('project management makes a team member a trusted person', async ({ browser }) => {
	const memberPage = await signedIn(browser, { id: member.id, startUrl: TEAM_MESSAGES });
	await expect(memberPage.getByText('Du betreust noch kein Postfach.')).toBeVisible();

	const managementPage = await signedIn(browser, {
		id: management.id,
		startUrl: `${DASHBOARD}/team/members`
	});
	await managementPage
		.getByRole('row')
		.filter({ hasText: `${member.id}@e2e.test` })
		.getByTestId('team-functions-open')
		.click();
	const trusted = managementPage
		.getByTestId('team-function-trusted')
		.getByRole('checkbox', { name: 'Vertrauensperson' });
	await expect(trusted).not.toBeChecked();
	await trusted.check();

	// the member answers the shared inbox and their own now
	await expect(memberPage.getByTestId('chat-workspace')).toBeVisible();
	await expect(inboxChip(memberPage, 'Vertrauenspersonen')).toBeVisible();
	await expect(inboxChip(memberPage, 'An mich persönlich')).toBeVisible();

	await trusted.uncheck();
	await expect(memberPage.getByText('Du betreust noch kein Postfach.')).toBeVisible();
});

test('a supervisor takes no part in the chats', async ({ page }) => {
	await loginAs(page, fixedTestUser(fixture.supervisorId), { startUrl: DASHBOARD });
	await expect(page.getByTestId('messages-link-unread')).toHaveCount(0);
	await expect(page.getByRole('link', { name: /^Nachrichten/ })).toHaveCount(0);

	await page.goto(MESSAGES);
	await expect(
		page.getByText(
			'Nachrichten stehen nur Delegierten und Einzelteilnehmenden der Konferenz offen.'
		)
	).toBeVisible();
	await expect(page.getByTestId('chat-new')).toHaveCount(0);
});

test('an open chat has no serious accessibility violations, also in high contrast', async ({
	page
}) => {
	// set before the first paint, as the footer's toggle would (`#lib/helpers/contrast`)
	await page.addInitScript(() => localStorage.setItem('contrast', 'more'));
	await loginAs(page, fixedTestUser(anna.id, fixture.claims(anna.id)), { startUrl: MESSAGES });
	await openChat(page, /Frankreich · MSGV/);
	await expect(page.getByTestId('chat-message').first()).toBeVisible();

	const scan = async () => {
		const { violations } = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
			// what only `vite dev` mounts (E2E_SERVER=dev)
			.exclude('.inspect-panel')
			.exclude('[data-dev-tools]')
			.analyze();
		return violations
			.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
			.flatMap((violation) =>
				violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`)
			);
	};
	expect(await scan()).toEqual([]);

	// the picker is a dialog of its own
	await page.getByTestId('chat-new').click();
	await expect(page.getByTestId('chat-contact').first()).toBeVisible();
	expect(await scan()).toEqual([]);
});
