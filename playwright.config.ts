import { existsSync } from 'node:fs';
import { setPriority } from 'node:os';
import { defineConfig, devices } from '@playwright/test';

// The seed (globalSetup) reads DATABASE_URL and friends from the environment, and neither
// Playwright nor `bun run` hands it `.env`. Variables already set (CI) win over the file.
if (existsSync('.env')) process.loadEnvFile('.env');

// Lowest CPU priority by default, so a local run yields to everything else on the machine. The
// server, the workers and every browser they start inherit it. `E2E_NICE=0` runs at full priority.
setPriority(Number(process.env.E2E_NICE ?? (process.env.CI ? 0 : 19)));

/**
 * What the suite runs against (`E2E_SERVER`):
 * - `build` (default): builds the app, then serves it with `vite preview`. Pages load at
 *   production speed, nothing is compiled on demand, and editing the sources mid-run changes
 *   nothing - the dev server reloads its whole program on every save.
 * - `preview`: serves the build already in `build/`, for running the suite again without
 *   rebuilding.
 * - `dev`: the Vite dev server, as `bun run dev` serves it. Slower; what the coverage run needs,
 *   since it maps the served modules back to the sources.
 */
const SERVER = process.env.E2E_SERVER ?? 'build';
if (!['build', 'preview', 'dev'].includes(SERVER)) {
	throw new Error(`E2E_SERVER must be build, preview or dev, not "${SERVER}"`);
}

// Overridable so the suite can run alongside other local projects already holding the port
// (and so CI can shard without port collisions). A build gets vite preview's port by default, so a
// running dev server on 5173 is not mistaken for it.
const PORT = Number(process.env.E2E_PORT ?? (SERVER === 'dev' ? 5173 : 4173));
const baseURL = `http://localhost:${PORT}`;

// A build is a production build whatever `.env` says: under NODE_ENV=development Vite compiles
// Svelte in dev mode. Signing in still works, since the OIDC setup trusts a provider on this
// machine over plain HTTP (`isLoopbackIssuer`, src/api/services/oidc/OIDC.ts).
const serve =
	SERVER === 'dev'
		? `bun run dev:server -- --port ${PORT} --strictPort`
		: `NODE_ENV=production bun run preview -- --port ${PORT} --strictPort`;

export default defineConfig({
	testDir: './e2e',
	globalSetup: './e2e/seed/seed.ts',
	// Files run side by side, the tests of one file in order: specs reset and reuse their fixtures
	// from test to test.
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	// Every worker drives its own browser, so more of them trade heat for time. `E2E_WORKERS=1`
	// runs the files one after another.
	workers: Number(process.env.E2E_WORKERS ?? 2),
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	timeout: 30_000,
	use: {
		baseURL,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: SERVER === 'build' ? `NODE_ENV=production bun run build && ${serve}` : serve,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		// A build takes a few minutes on a slow machine.
		timeout: SERVER === 'build' ? 600_000 : 120_000,
		stdout: 'pipe',
		stderr: 'pipe'
	}
});
