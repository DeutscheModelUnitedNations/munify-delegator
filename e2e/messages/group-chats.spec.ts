import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { groupChatsFixture } from '../seed/groupChats';

// The groups of committees and custom roles as people use them: a delegate opens their
// committee's group and writes, another reads it with the author's role and mutes it, the chair
// writes in from the team's messages page, a single participant asks their role's support, and
// project management hands out the support of a custom role. The specs build on each other's
// chats, so they run in order; the fixture (e2e/seed/groupChats.ts) starts every run without any.
// Who may read what is e2e/authorization/group-chats.spec.ts.
test.describe.configure({ mode: 'serial', timeout: 90_000 });

const fixture = groupChatsFixture('ui');
const DASHBOARD = `/dashboard/${fixture.conferenceId}`;
const MESSAGES = `${DASHBOARD}/messages`;
const TEAM_MESSAGES = `${DASHBOARD}/team/messages`;
const { anna, carla } = fixture.delegates;
const { pia } = fixture.singles;
const { chair, support, management, member } = fixture.team;
const GROUP = `Gruppe ${fixture.gv}`;

async function signedIn(
	browser: import('@playwright/test').Browser,
	{ id, startUrl }: { id: string; startUrl: string }
) {
	const page = await (await browser.newContext()).newPage();
	await loginAs(page, fixedTestUser(id, fixture.claims(id)), { startUrl });
	return page;
}

async function write(page: Page, text: string) {
	await page.getByTestId('chat-input').fill(text);
	await page.getByTestId('chat-send').click();
	await expect(page.getByTestId('chat-message').filter({ hasText: text })).toBeVisible();
	await expect(page.getByTestId('chat-input')).toHaveValue('');
}

const openChat = (page: Page, title: string | RegExp) =>
	page.getByTestId('chat-list').getByRole('button', { name: title }).click();

test("a delegate writes in their committee's group, another reads it by role and mutes it", async ({
	browser
}) => {
	const annaPage = await signedIn(browser, { id: anna.id, startUrl: MESSAGES });
	await annaPage.getByTestId('chat-start-option').filter({ hasText: GROUP }).click();
	await expect(annaPage.getByTestId('chat-title')).toHaveText(GROUP);
	await write(annaPage, 'Hallo Gremium, wer ist schon da?');

	const carlaPage = await signedIn(browser, { id: carla.id, startUrl: MESSAGES });
	await openChat(carlaPage, new RegExp(GROUP));
	const message = carlaPage
		.getByTestId('chat-message')
		.filter({ hasText: 'Hallo Gremium, wer ist schon da?' });
	await expect(message).toBeVisible();
	// participants know each other by role in a group too
	await expect(carlaPage.getByText(`Deutschland · ${fixture.gv}`)).toBeVisible();
	await expect(carlaPage.getByText('Anna Alpha')).toHaveCount(0);

	await carlaPage.getByTestId('chat-menu').click();
	await carlaPage.getByTestId('chat-mute').click();
	await expect(carlaPage.getByText('Gruppe stummgeschaltet')).toBeVisible();
	await carlaPage.getByTestId('chat-menu').click();
	await expect(carlaPage.getByTestId('chat-mute')).toHaveAttribute('aria-pressed', 'true');
	await expect(carlaPage.getByTestId('chat-list').getByText('Stummgeschaltet')).toBeAttached();
});

test("the chair writes in the committee's group from the team's messages", async ({ browser }) => {
	const chairPage = await signedIn(browser, { id: chair.id, startUrl: TEAM_MESSAGES });
	await chairPage
		.getByRole('group', { name: 'Nach Postfach filtern' })
		.getByRole('button', { name: /^Gruppen/ })
		.click();
	await openChat(chairPage, new RegExp(GROUP));
	await write(chairPage, 'Willkommen! Die Sitzung beginnt um 9 Uhr.');

	const annaPage = await signedIn(browser, { id: anna.id, startUrl: MESSAGES });
	await openChat(annaPage, new RegExp(GROUP));
	await expect(
		annaPage.getByTestId('chat-message').filter({ hasText: 'Die Sitzung beginnt um 9 Uhr.' })
	).toContainText('Chris Chair');
});

test("a single participant asks their role's support, which answers from its inbox", async ({
	browser
}) => {
	const piaPage = await signedIn(browser, { id: pia.id, startUrl: MESSAGES });
	await expect(
		piaPage.getByTestId('chat-start-option').filter({ hasText: `Gruppe ${fixture.pressName}` })
	).toBeVisible();
	await piaPage
		.getByTestId('chat-start-option')
		.filter({ hasText: `Betreuung ${fixture.pressName}` })
		.click();
	await write(piaPage, 'Bekommen wir Presseausweise?');

	const supportPage = await signedIn(browser, { id: support.id, startUrl: TEAM_MESSAGES });
	await openChat(supportPage, /Bekommen wir Presseausweise/);
	await write(supportPage, 'Ja, am Infopoint.');
	// the team opens the role's group without waiting for a participant
	await supportPage
		.getByRole('group', { name: 'Nach Postfach filtern' })
		.getByRole('button', { name: /^Gruppen/ })
		.click();
	await expect(supportPage.getByTestId('team-open-group')).toHaveText(
		`Gruppe ${fixture.pressName}`
	);
});

test('project management hands out the support of a custom role', async ({ browser }) => {
	const pmPage = await signedIn(browser, {
		id: management.id,
		startUrl: `${DASHBOARD}/team/members`
	});
	await pmPage.getByRole('row', { name: /Milan/ }).getByTestId('team-functions-open').click();
	const roles = pmPage.getByTestId('team-functions-roles');
	const toggle = roles.getByRole('checkbox', { name: `Betreuung ${fixture.pressName}` });
	await expect(toggle).not.toBeChecked();
	await toggle.check();
	await expect(toggle).toBeChecked();

	const memberPage = await signedIn(browser, { id: member.id, startUrl: TEAM_MESSAGES });
	await expect(
		memberPage
			.getByRole('group', { name: 'Nach Postfach filtern' })
			.getByRole('button', { name: /^Betreuung/ })
	).toBeVisible();
});
