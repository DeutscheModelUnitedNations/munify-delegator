import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCREENSHOT_THEMES } from '@deutschemodelunitednations/docs-kit';
import { captureShots } from '@deutschemodelunitednations/docs-kit/capture';
import { seedConferenceId } from '../../src/api/db/seed-dev/plans';
import { SHOTS } from './shots';
import type { MessageKey, Persona, StageIds } from './types';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
// DOCS_LOCALES / DOCS_THEMES (comma separated) narrow a run while working on a shot
const LOCALES = process.env.DOCS_LOCALES?.split(',') ?? ['de', 'en'];
const THEMES = process.env.DOCS_THEMES?.split(',') ?? SCREENSHOT_THEMES;

/** The seed is loaded once by `run.ts`, and its conference ids are fixed */
const ids: StageIds = { conferenceId: seedConferenceId };

/**
 * Captures every shot in every locale and theme. `filter` limits the run to ids starting with
 * it, e.g. `team/`.
 */
export function capture({ baseUrl, filter }: { baseUrl: string; filter?: string }) {
	const roles = [...new Set(SHOTS.map((shot) => shot.role))];
	return captureShots<StageIds, Persona, MessageKey>({
		baseUrl,
		shots: SHOTS,
		roles,
		filter,
		locales: LOCALES,
		themes: THEMES,
		outDir: join(ROOT, 'static/docs-assets/screenshots'),
		messagesDir: join(ROOT, 'messages'),
		stage: async () => ids,
		// DOCS_CHROMIUM: a Chromium installed elsewhere, when Playwright's own download is missing
		launch: process.env.DOCS_CHROMIUM ? { executablePath: process.env.DOCS_CHROMIUM } : undefined,
		// The locale is the URL's: German without a prefix, English below `/en`
		localeCookie: false,
		localizePath: ({ path, locale }) => (locale === 'de' ? path : `/${locale}${path}`),
		// Dark mode follows the system colour scheme, which the capture emulates
		themeStorage: () => ({}),
		// The dev server's tools button and value inspector are not part of the app
		css: '.fab, .inspect-panel { display: none !important; }',
		async login({ page, baseUrl, role }) {
			await page.goto(`${baseUrl}/login?next=/dashboard`);
			// A dev server compiles the dashboard on its first visit, which can take a while
			await page.locator(`button[name="sub"][value="${role}"]`).click({ noWaitAfter: true });
			await page.waitForURL((url) => url.href.startsWith(`${baseUrl}/dashboard`), {
				timeout: 120_000
			});
		}
	});
}
