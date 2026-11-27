import type { Page } from '@playwright/test';
import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { TEAM_OVERVIEW } from '../seed/teamOverview';

// The widgets of the team's overview (stages/TeamMember/teamWidgets.ts): which show in a stage,
// for whom, and what a few of them say about the fixture (e2e/seed/teamOverview.ts).

const widgets = (page: Page) => page.locator('[data-testid="team-widgets"] > section');
const widget = (page: Page, id: string) => page.getByTestId(`widget-${id}`);

/** Signs in and opens the conference's overview, with the browser's clock at `now` if given. */
async function open(
	page: Page,
	{ userId, conferenceId, now }: { userId: string; conferenceId: string; now?: string }
) {
	await loginAs(page, fixedTestUser(userId));
	if (now) await page.clock.setSystemTime(new Date(now));
	await page.goto(`/dashboard/${conferenceId}`);
}

/** The widgets in the order they appear, once all of them loaded */
async function shownWidgets(page: Page, count: number) {
	await expect(widgets(page)).toHaveCount(count, { timeout: 30_000 });
	return widgets(page).evaluateAll((sections) =>
		sections.map((section) => section.getAttribute('data-testid'))
	);
}

test('project management prepares the conference with the big picture first', async ({ page }) => {
	await open(page, {
		userId: TEAM_OVERVIEW.managementId,
		conferenceId: TEAM_OVERVIEW.preparationId,
		now: TEAM_OVERVIEW.preparationNow
	});

	expect(await shownWidgets(page, 8)).toEqual([
		'widget-timeline',
		'widget-readiness',
		'widget-payments',
		'widget-committees',
		'widget-papers',
		'widget-communication',
		'widget-messages',
		'widget-participants'
	]);
	await expect(widget(page, 'timeline')).toHaveAttribute('data-size', 'large');
	await expect(widget(page, 'participants')).toHaveAttribute('data-size', 'compact');

	// The timeline: the deadline passed, the payment deadline and the survey ahead
	const timeline = widget(page, 'timeline');
	await expect(timeline.locator('[aria-current="step"]')).toContainText('Vorbereitung');
	await expect(timeline.getByTestId('milestone').first()).toContainText('Bewerbungsschluss');
	await expect(timeline.getByTestId('milestone').first()).toContainText('Erledigt');
	await expect(timeline).toContainText('Zahlungsfrist');
	await expect(timeline).toContainText('In 7 Tagen');
	const survey = timeline.getByTestId('milestone').filter({ hasText: TEAM_OVERVIEW.surveyTitle });
	await expect(survey).toContainText('1 haben noch nicht geantwortet');
	await expect(timeline.getByTestId('timeline-next-state')).toHaveCount(0);

	// The readiness check: the guide is not published, the schedule has no days
	const readiness = widget(page, 'readiness');
	await expect(readiness.getByTestId('readiness-guide')).toHaveAttribute('data-done', 'false');
	await expect(readiness.getByTestId('readiness-calendar')).toContainText(
		'3 Konferenztage ohne Zeitplan'
	);
	await readiness.getByRole('link', { name: '3 Konferenztage ohne Zeitplan' }).click();
	await expect(page).toHaveURL(/\/team\/calendar$/);
});

test('a reviewer sees the papers, not the money or the surveys', async ({ page }) => {
	await open(page, {
		userId: TEAM_OVERVIEW.reviewerId,
		conferenceId: TEAM_OVERVIEW.preparationId,
		now: TEAM_OVERVIEW.preparationNow
	});

	expect(await shownWidgets(page, 3)).toEqual([
		'widget-timeline',
		'widget-papers',
		'widget-messages'
	]);
	// The conference's own dates show; the surveys are participant care's
	const timeline = widget(page, 'timeline');
	await expect(timeline).toContainText('Zahlungsfrist');
	await expect(timeline).not.toContainText(TEAM_OVERVIEW.surveyTitle);
	// Nothing in the messages: said in words
	await expect(widget(page, 'messages').getByTestId('widget-empty')).toContainText(
		'Alles beantwortet.'
	);
});

test('a plain member sees what the whole team may open', async ({ page }) => {
	await open(page, {
		userId: TEAM_OVERVIEW.memberId,
		conferenceId: TEAM_OVERVIEW.preparationId,
		now: TEAM_OVERVIEW.preparationNow
	});

	expect(await shownWidgets(page, 2)).toEqual(['widget-timeline', 'widget-messages']);
});

test('while the conference runs, the entrance and what is on lead', async ({ page }) => {
	await open(page, { userId: TEAM_OVERVIEW.careId, conferenceId: TEAM_OVERVIEW.activeId });

	const shown = await shownWidgets(page, 7);
	expect(shown.slice(0, 3)).toEqual(['widget-now', 'widget-entrance', 'widget-messages']);
	await expect(widget(page, 'now').getByTestId('widget-empty')).toContainText(
		'Im Zeitplan steht nichts mehr an.'
	);

	const entrance = widget(page, 'entrance');
	await expect(entrance.getByTestId('entrance-checked-in')).toHaveText('1');
	await expect(entrance).toContainText('von 2 mit Platz eingecheckt');
	await expect(entrance.getByTestId('entrance-minors')).toContainText('1');
});

test('after the conference the wrap-up comes first', async ({ page }) => {
	await open(page, { userId: TEAM_OVERVIEW.managementId, conferenceId: TEAM_OVERVIEW.postId });

	expect(await shownWidgets(page, 4)).toEqual([
		'widget-wrap-up',
		'widget-timeline',
		'widget-messages',
		'widget-communication'
	]);
	const wrapUp = widget(page, 'wrap-up');
	await expect(wrapUp.getByTestId('wrap-up-holders')).toHaveText('1');
	await expect(wrapUp).toContainText('bekommen eins, von 1 mit Platz');
	await expect(wrapUp.getByTestId('wrap-up-thanks')).toHaveAttribute('data-done', 'false');
});
