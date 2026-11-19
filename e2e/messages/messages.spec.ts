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

/** An inbox the caller answers, in the team menu: it narrows the chat list to that inbox. */
const inboxChip = (page: Page, name: string) =>
	page.getByTestId('team-inbox-menu').getByRole('link', { name });

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
	const sections = terms.getByTestId('chat-terms-section');
	await expect(sections).toHaveCount(7);
	await expect(terms).toContainText('Wer deine Nachrichten lesen kann');
	await expect(terms).toContainText('0 von 7 gelesen');
	// the first section opens with its full text, the others show their gist only
	await expect(sections.first()).toContainText('Notruf 112');
	await expect(sections.nth(3)).toContainText('Nicht Ende-zu-Ende-verschlüsselt');
	await expect(sections.nth(3).getByRole('button', { expanded: false })).toBeVisible();
	await expect(sections.nth(3).getByTestId('chat-terms-understood')).toBeHidden();
	await expect(page.getByTestId('chat-message')).toHaveCount(0);
	// nothing goes out without her agreement, and her text is kept
	await expect(page.getByTestId('chat-terms-accept')).toBeDisabled();
	await expect(page.getByTestId('chat-terms-confirm').first()).toBeDisabled();
	await terms.getByRole('button', { name: 'Abbruch' }).click();
	await expect(page.getByTestId('chat-input')).toHaveValue('Hallo aus Deutschland');
	await expect(page.getByTestId('chat-message')).toHaveCount(0);

	await page.getByTestId('chat-send').click();
	// she confirms one section after the other; each opens the next
	for (let index = 0; index < 7; index++) {
		await expect(sections.nth(index).getByRole('button', { expanded: true })).toBeVisible();
		await sections.nth(index).getByTestId('chat-terms-understood').click();
	}
	await expect(terms).toContainText('7 von 7 gelesen');
	// the last confirmation closes its section, so the focus moves on to the statements
	await expect(page.getByTestId('chat-terms-confirm').first()).toBeFocused();
	// only then the statements can be ticked, and only both together agree
	const statements = page.getByTestId('chat-terms-confirm');
	await expect(statements).toHaveCount(2);
	await statements.first().check();
	await expect(page.getByTestId('chat-terms-accept')).toBeDisabled();
	await statements.nth(1).check();
	await page.getByTestId('chat-terms-accept').click();
	await expect(
		page.getByTestId('chat-message').filter({ hasText: 'Hallo aus Deutschland' })
	).toBeVisible();
	await expect(terms).toBeHidden();

	// and they stay there to read, without anything to confirm
	await page.getByTestId('chat-terms-read').click();
	await expect(terms.getByTestId('chat-terms-section')).toHaveCount(7);
	await expect(page.getByTestId('chat-terms-understood')).toHaveCount(0);
	await expect(page.getByTestId('chat-terms-confirm')).toHaveCount(0);
	await terms.getByRole('button', { name: 'Respektvoller Umgang' }).click();
	await expect(terms).toContainText('Schreibe so, wie du selbst angeschrieben werden möchtest.');
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

test('an answered chat is archived and comes back with the next message', async ({ browser }) => {
	const reviewerPage = await signedIn(browser, { id: reviewer.id, startUrl: TEAM_MESSAGES });
	const list = reviewerPage.getByTestId('chat-list');
	await openChat(reviewerPage, /Deutschland · MSGV/);

	// archiving closes the chat and takes it out of the list
	await reviewerPage.getByTestId('chat-archive').click();
	await expect(reviewerPage.getByTestId('chat-thread')).toBeHidden();
	await expect(list).toBeHidden();
	await expect(reviewerPage.getByText('Erledigte Chats findest du im Archiv.')).toBeVisible();

	// the archive is hidden until it is asked for
	const toggle = reviewerPage.getByTestId('chat-archive-toggle');
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');
	await expect(toggle).toContainText('1');
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	const archived = list.getByRole('button', { name: /Deutschland · MSGV/ });
	await expect(archived).toContainText('Archiviert');
	await toggle.click();
	await expect(list).toBeHidden();

	// the participant's next message brings it back, live
	const annaPage = await signedIn(browser, { id: anna.id, startUrl: MESSAGES });
	await openChat(annaPage, 'Gremienberatung · MSGV');
	await write(annaPage, 'Und wie viele Quellen?');
	const back = list.getByRole('button', { name: /Deutschland · MSGV/ });
	await expect(back).toBeVisible();
	await expect(back).not.toContainText('Archiviert');
	await expect(toggle).toBeHidden();

	// it can also be taken out of the archive by hand
	await back.click();
	const button = reviewerPage.getByTestId('chat-archive');
	await button.click();
	await toggle.click();
	await list.getByRole('button', { name: /Deutschland · MSGV/ }).click();
	await expect(button).toHaveAttribute('aria-pressed', 'true');
	await button.click();
	await expect(button).toHaveAttribute('aria-pressed', 'false');
	await expect(list.getByRole('button', { name: /Deutschland · MSGV/ })).not.toContainText(
		'Archiviert'
	);

	for (const page of [reviewerPage, annaPage]) await page.context().close();
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
	// participant care starts at the overview of what it answers: its inbox and the reports
	const overview = carePage.getByTestId('team-inbox-overview');
	await expect(overview.getByTestId('team-inbox-card')).toContainText('Teilnehmendenbetreuung');
	await expect(overview.getByTestId('team-reports-card')).toContainText('1 gemeldete Chats warten');
	await overview.getByTestId('team-reports-card').click();
	const report = carePage.getByTestId('chat-reports').getByRole('listitem');
	await expect(report).toContainText('Frankreich · MSGV');
	await expect(report).toContainText('Bitte schaut euch das an.');
	await carePage.getByTestId('chat-report-open').click();

	// the case file beside the chat: the report, and both people by name and role
	const file = carePage.getByTestId('chat-case-file');
	await expect(file.getByTestId('chat-case-report')).toContainText(
		`Gemeldet von ${carla.given} ${carla.family}`
	);
	const people = file.getByTestId('chat-case-people').getByRole('listitem');
	await expect(people).toHaveCount(2);
	await expect(people.filter({ hasText: `${carla.given} ${carla.family}` })).toContainText(
		'hat gemeldet'
	);

	// participant care reads along, with the names, and cannot write
	const thread = carePage.getByTestId('chat-thread');
	await expect(thread).toContainText('Du liest diesen Chat, weil er gemeldet wurde.');
	await expect(thread).toContainText(`${anna.given} ${anna.family}`);
	await expect(thread.getByTestId('chat-message')).toContainText(['Hallo aus Deutschland']);
	await expect(thread.getByTestId('chat-reported-divider')).toContainText('Gemeldet');
	await expect(carePage.getByTestId('chat-input')).toHaveCount(0);
	await expect(carePage.getByTestId('chat-refusal')).toBeVisible();

	// suspending Germany's delegate closes her chats with other participants
	const suspendAnna = people
		.filter({ hasText: `${anna.given} ${anna.family}` })
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

	// participant care hides a message for everybody, with a reason, for good
	const hello = thread.getByTestId('chat-message').filter({ hasText: 'Hallo aus Deutschland' });
	await hello.getByTestId('chat-message-hide').click();
	await expect(carePage.getByText('Das Ausblenden ist endgültig.')).toBeVisible();
	await expect(carePage.getByTestId('chat-hide-confirm')).toBeDisabled();
	await carePage.getByTestId('chat-hide-reason').fill('Unangemessener Ton');
	await carePage.getByTestId('chat-hide-confirm').click();
	// participant care keeps the text, marked as hidden, and cannot hide it again
	await expect(hello).toContainText('Für die Beteiligten ausgeblendet');
	await expect(hello).toContainText('Grund: Unangemessener Ton');
	await expect(hello.getByTestId('chat-message-hide')).toHaveCount(0);
	// the chat's people, the author too, read a placeholder instead
	await openChat(annaPage, /Frankreich · MSGV/);
	const placeholder = annaPage.getByTestId('chat-message').filter({
		hasText: 'Diese Nachricht wurde von der Teilnehmendenbetreuung ausgeblendet.'
	});
	await expect(placeholder).toHaveCount(1);
	await expect(annaPage.getByTestId('chat-thread')).not.toContainText('Hallo aus Deutschland');

	// settling it with a note closes the case; the note and the hidden message stay with the
	// settled reports
	await carePage.getByTestId('chat-case-note').fill('Mit beiden gesprochen.');
	await carePage.getByTestId('chat-report-resolve').click();
	await expect(carePage.getByTestId('chat-no-reports')).toBeVisible();
	await carePage.getByText('Erledigte Meldungen (1)').click();
	await expect(carePage.getByText('Mit beiden gesprochen.')).toBeVisible();
	await expect(carePage.getByTestId('chat-report-hidden-message')).toContainText([
		'Hallo aus Deutschland'
	]);
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
	// a trusted person answers two inboxes, so the page starts at their overview
	await expect(theoPage.getByTestId('team-inbox-card')).toHaveCount(2);
	await inboxChip(theoPage, 'An mich persönlich').click();
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
	await expect(memberPage.getByTestId('team-inbox-card')).toHaveCount(2);
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
