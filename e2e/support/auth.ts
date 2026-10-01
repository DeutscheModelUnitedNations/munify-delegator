import { expect, type Page } from '@playwright/test';

/**
 * Claims the oidc-mock login page (oidc-mock.yaml, served by `vite dev`) signs into the tokens,
 * normalized by src/api/services/OIDC.ts into an OIDCUser.
 */
export interface TestUserClaims {
	email: string;
	given_name: string;
	family_name: string;
	preferred_username: string;
	locale?: string;
	roles?: string[];
	[key: string]: unknown;
}

let counter = 0;

/**
 * Builds a unique set of OIDC claims for a fresh test user. Uniqueness matters because
 * the app upserts a User row keyed by the token's `sub`/email on first login - reusing
 * claims across tests would make them share (and race on) the same account.
 */
export function makeTestUser(
	prefix: string,
	overrides: Partial<TestUserClaims> = {}
): TestUserClaims {
	const unique = `e2e-${prefix}-${Date.now()}-${counter++}`;
	return {
		email: `${unique}@e2e.test`,
		given_name: 'E2E',
		family_name: prefix,
		preferred_username: unique,
		locale: 'de',
		...overrides
	};
}

/**
 * Claims for a user with a fixed, predictable id - use this (instead of `makeTestUser`) whenever
 * a test needs the DB fixtures (TeamMember, DelegationMember, ...) seeded ahead of time in
 * e2e/seed/seed.ts, since those rows are created against a fixed userId that must match this
 * user's OIDC `sub`. `loginAs` signs in with `preferred_username` as the token's `sub`, so `id`
 * must be exactly the id used when seeding.
 */
export function fixedTestUser(id: string, overrides: Partial<TestUserClaims> = {}): TestUserClaims {
	return {
		email: `${id}@e2e.test`,
		given_name: 'E2E',
		family_name: id,
		preferred_username: id,
		locale: 'de',
		...overrides
	};
}

/**
 * Path the oidc-mock provider lives under (`base_path` in oidc-mock.yaml), derived from the same
 * env var the app uses. Its Vite plugin serves the login page on the app's own origin and
 * rewrites the app's redirects to it into relative ones, so the provider is recognised by path,
 * not by origin.
 */
const OIDC_BASE_PATH = new URL(
	(
		process.env.PUBLIC_OIDC_AUTHORITY ??
		'http://127.0.0.1:8090/oidc/.well-known/openid-configuration'
	).replace(/\/\.well-known\/openid-configuration$/, '')
).pathname;

/** True while `url` is on the mock OIDC provider rather than the app under test. */
function isOidcUrl(url: string | URL): boolean {
	try {
		const { pathname } = new URL(url.toString());
		return pathname === OIDC_BASE_PATH || pathname.startsWith(`${OIDC_BASE_PATH}/`);
	} catch {
		return false;
	}
}

/**
 * Signs in on the oidc-mock login page as `claims`, then - for a brand new user - completes the
 * mandatory "additional info" profile form the app requires before granting access to the rest
 * of the app. Ends with `page` navigated to `startUrl` (or wherever the app redirected to).
 */
export async function loginAs(
	page: Page,
	claims: TestUserClaims,
	opts: { startUrl?: string } = {}
): Promise<void> {
	const startUrl = opts.startUrl ?? '/dashboard';
	await page.goto(startUrl);

	await page.waitForURL((url) => isOidcUrl(url), { timeout: 15_000 });
	// The page's "custom claims" form: any `sub`, any claims. Its per-user buttons are for the
	// fixed accounts in oidc-mock.yaml, which the suite does not use. The form sits in a collapsed
	// <details>, so it is opened first.
	await page.getByText('Sign in with custom claims').click();
	await page.locator('#custom_sub').fill(claims.preferred_username);
	await page.locator('#custom_claims').fill(JSON.stringify(claims));
	await page.locator('button[name="custom"]').click();

	await page.waitForURL((url) => !isOidcUrl(url), { timeout: 15_000 });

	if (new URL(page.url()).pathname.startsWith('/my-account')) {
		await completeMandatoryProfile(page, claims);
	}

	// A returning fixed-actor user (see `fixedTestUser`) skips the /my-account detour entirely,
	// landing straight on `startUrl` - which otherwise conveniently gives the page's JS bundle a
	// few extra round trips to finish hydrating before a test's first real interaction. Without
	// that buffer, an interaction fired immediately after this function returns can race
	// SvelteKit's hydration (the click/input fires before the handler is attached and is lost).
	await waitForHydration(page);
}

/**
 * `page.reload()` (or any fresh navigation) followed immediately by an interaction is prone to
 * the same hydration race as a fresh `loginAs` login (see the hydration wait there) - the
 * click/input can fire before Svelte's handler is attached. Use this after any `page.reload()`
 * a test does mid-flow, right before the next interaction.
 */
export async function waitForHydration(page: Page): Promise<void> {
	// The root layout sets this in `onMount`. Not `networkidle`: the subscription stream stays open
	// for as long as the page shows live data, so the network never goes idle on most pages.
	await page.waitForFunction(() => document.body.dataset.hydrated === 'true', undefined, {
		timeout: 15_000
	});
}

/**
 * Fills the profile fields the app requires (see my-account/form-schema.ts) using the
 * dev-only "Fake User" helper for the fields it covers, and fills in the one field it
 * doesn't (gender) by hand, then saves.
 */
async function completeMandatoryProfile(page: Page, claims: TestUserClaims): Promise<void> {
	// The "Fake User" dev helper fills every field it can, but not the legal name (which is
	// deliberately kept separate from the OIDC given/family name claims) or gender. Fill the
	// legal name from `claims` (not a fixed literal) so tests that need to tell users apart by
	// name (e.g. multiple delegation members in one table) still can - see delegation-member-
	// management.spec.ts, which broke when this used to hardcode 'E2E'/'Tester' for everyone.
	// Retry the click: on a freshly-loaded page the button can be present before hydration
	// attaches its handler, in which case the first click is a no-op.
	// FakeUser.svelte always writes this exact phone number - check for that literal value
	// rather than "any non-empty value", since a pre-seeded user (fixedTestUser fixtures) can
	// already have a non-empty (and possibly invalid) phone number before the button ever fires.
	const fakeUserButton = page.getByRole('button', { name: /fake user/i });
	const phoneInput = page.locator('input[name="phone"]');
	await expect(fakeUserButton).toBeVisible({ timeout: 10_000 });
	await expect(async () => {
		await fakeUserButton.click();
		await expect(phoneInput).toHaveValue(/176\s?12345678/, { timeout: 2_000 });
	}).toPass({ timeout: 15_000 });

	await page.locator('input[name="given_name"]').fill(claims.given_name);
	await page.locator('input[name="family_name"]').fill(claims.family_name);
	// formsnap generates a random `id` per field (`useId()`) rather than one derived from the
	// field name, so `#gender` no longer matches anything - select by `name` instead, like the
	// two inputs above.
	await page.locator('select[name="gender"]').selectOption('NO_STATEMENT');

	const beforePath = new URL(page.url()).pathname;
	const saveButton = page.locator('.card-body form button.btn-primary').first();
	await expect(saveButton).toBeEnabled({ timeout: 5_000 });
	await saveButton.click();
	await page.waitForURL((url) => new URL(url).pathname !== beforePath, { timeout: 15_000 });
}
