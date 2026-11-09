import type { Page } from 'playwright';
import type { ConferenceKey } from '../../src/api/db/seed-dev/plans';
import type { Shot, StageIds } from './types';

const dashboard =
	(key: ConferenceKey, page = '') =>
	(ids: StageIds) =>
		`/dashboard/${ids.conferenceId(key)}${page}`;
const team = (key: ConferenceKey, page: string) => dashboard(key, `/team/${page}`);

const TALL = { width: 1280, height: 1000 };

/** Waits until no spinner is left: the assignment's pools load their pages after the page */
async function loaded({ page }: { page: Page }) {
	await page.waitForFunction(() => document.querySelectorAll('.loading').length === 0, null, {
		timeout: 60_000
	});
	await page.waitForTimeout(500);
}

/** The dashboard's hint to set up the phone, dismissed: it would cover half of every shot */
const phoneHintDismissed = (key: ConferenceKey) => ({
	[`phone-ready-hint-dismissed-seed-conference-${key}`]: '1'
});

/**
 * Every screenshot used in the manual. The docs test fails when a page references `shot:<id>`
 * that is not listed here, when a listed shot is used nowhere, or when one has not been captured.
 * Run `bun run docs:screenshots` after changing this list or the UI it shows. Shots only look:
 * they never change data, since the seed is loaded once per run.
 */
export const SHOTS: Shot[] = [
	// Participants
	{
		id: 'participant/registration-choice',
		role: 'dev-participant',
		path: dashboard('registration'),
		clip: '[data-tour="registration.choice"]'
	},
	{
		id: 'participant/dashboard-preparation',
		role: 'dev-head-delegate',
		path: dashboard('preparation'),
		storage: phoneHintDismissed('preparation'),
		viewport: TALL
	},
	{
		id: 'participant/dashboard-assignment-pending',
		role: 'dev-delegate',
		path: dashboard('locked')
	},

	// Team: settings
	{ id: 'team/configuration', role: 'dev-team-pm', path: team('preparation', 'configuration') },
	{
		id: 'team/committees',
		role: 'dev-team-content-lead',
		path: team('preparation', 'configuration?tab=committees')
	},
	{
		id: 'team/seat-planning',
		role: 'dev-team-content-lead',
		path: team('preparation', 'seat-planning')
	},

	// Team: assignment, on the conference whose registration closed and that has a draft
	{
		id: 'team/assignment-sighting',
		role: 'dev-team-care',
		path: team('closed', 'assignment/sighting'),
		prepare: loaded,
		viewport: TALL
	},
	{
		id: 'team/assignment-delegations',
		role: 'dev-team-care',
		path: team('closed', 'assignment/delegations'),
		prepare: loaded,
		viewport: TALL
	},
	{
		id: 'team/assignment-finish',
		role: 'dev-team-care',
		path: team('closed', 'assignment/finish'),
		prepare: loaded,
		viewport: TALL
	}
];
