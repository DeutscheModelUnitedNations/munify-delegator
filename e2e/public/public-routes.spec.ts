import { test, expect } from '../support/test';

// Unauthenticated, publicly reachable routes. None of them had coverage, and the certificate
// validator is the one place an outsider's input is cryptographically checked - a regression
// that made it accept anything would be invisible to every other test in the suite.

test('the certificate validator rejects a forged or malformed token', async ({ page }) => {
	// A syntactically well-formed JWT signed with the wrong key must not validate.
	const forged =
		'eyJhbGciOiJSUzI1NiJ9.eyJuIjoiTWFsbG9yeSIsInQiOiJGYWtlIENvbmZlcmVuY2UiLCJzIjoiMjAyNi0wMS0wMSIsImUiOiIyMDI2LTAxLTAyIn0.not-a-real-signature';

	await page.goto(`/validateCertificate/${forged}`);

	await expect(page.getByText(/ungültig|not valid/i).first()).toBeVisible({ timeout: 15_000 });
	// The forged holder name must never be presented as if it were verified.
	await expect(page.getByText('Mallory')).toHaveCount(0);
});

test('the certificate validator rejects obvious garbage in the token slot', async ({ page }) => {
	await page.goto('/validateCertificate/not-a-jwt-at-all');
	await expect(page.getByText(/ungültig|not valid/i).first()).toBeVisible({ timeout: 15_000 });
});

test('the selector and a conference page are public, what is behind them needs a login', async ({
	page
}) => {
	const res = await page.goto('/dashboard');
	expect(res?.status()).toBeLessThan(400);
	expect(new URL(page.url()).pathname).toBe('/dashboard');

	const conference = await page.goto('/dashboard/anything');
	expect(conference?.status()).toBeLessThan(400);
	expect(new URL(page.url()).pathname).toBe('/dashboard/anything');

	await page.goto('/dashboard/anything/payment');
	await page.waitForURL((url) => url.pathname.startsWith('/oidc'), { timeout: 15_000 });
});
