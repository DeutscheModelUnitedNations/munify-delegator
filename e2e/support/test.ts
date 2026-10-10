import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test as base, type Page } from '@playwright/test';
import libCoverage from 'istanbul-lib-coverage';
import v8ToIstanbul from 'v8-to-istanbul';
import { isMeasured } from '../../scripts/coverageScope';

export { expect, type Page } from '@playwright/test';

/**
 * Where browser coverage goes, when it is recorded at all: `scripts/e2eCoverage.ts` sets this
 * for its run, and a plain `playwright test` leaves it unset and records nothing.
 */
const coverageDir = process.env.E2E_BROWSER_COVERAGE_DIR;

const root = resolve(import.meta.dirname, '../..');

/** Only the app's own modules: Vite serves them from their path under the project root. */
function sourcePath(url: string) {
	const path = join(root, decodeURIComponent(new URL(url).pathname));
	return isMeasured(path, root) ? path : undefined;
}

/**
 * Folds one page's V8 coverage into `map`. Vite inlines a source map into every module it
 * serves in dev, which is what maps the compiled JavaScript back to the `.ts` and `.svelte`
 * files fallow scores.
 */
async function addPageCoverage(page: Page, map: libCoverage.CoverageMap) {
	for (const entry of await page.coverage.stopJSCoverage()) {
		const path = sourcePath(entry.url);
		if (!path || !entry.source?.includes('sourceMappingURL=data:')) continue;
		const converter = v8ToIstanbul(path, 0, { source: entry.source });
		try {
			await converter.load();
			converter.applyCoverage(entry.functions);
			map.merge(converter.toIstanbul());
		} catch {
			// A module whose map cannot be read is simply left out of the report.
		} finally {
			converter.destroy();
		}
	}
}

/**
 * Playwright's `test`, plus browser coverage of the default `page` when a coverage run asked for
 * it. Pages a test opens on contexts of its own are not recorded.
 */
export const test = base.extend<object, { browserCoverage: libCoverage.CoverageMap | undefined }>({
	browserCoverage: [
		// eslint-disable-next-line no-empty-pattern -- Playwright requires the destructuring
		async ({}, use) => {
			if (!coverageDir) return use(undefined);
			const map = libCoverage.createCoverageMap({});
			await use(map);
			mkdirSync(coverageDir, { recursive: true });
			writeFileSync(join(coverageDir, `${randomUUID()}.json`), JSON.stringify(map.toJSON()));
		},
		{ scope: 'worker' }
	],
	page: async ({ page, browserCoverage, browserName }, use) => {
		const recording = !!browserCoverage && browserName === 'chromium';
		if (recording) await page.coverage.startJSCoverage({ resetOnNavigation: false });
		await use(page);
		if (recording) await addPageCoverage(page, browserCoverage);
	}
});
