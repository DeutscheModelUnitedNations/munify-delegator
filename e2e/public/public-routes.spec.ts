import { test, expect } from '@playwright/test';
import { E2E_CONFERENCE_ID } from '../seed/seed';

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

test('the public seats page renders for an anonymous visitor', async ({ page }) => {
	const res = await page.goto(`/seats/${E2E_CONFERENCE_ID}`);

	expect(res?.status()).toBeLessThan(400);
	// It must render conference content rather than bouncing to the OIDC provider.
	expect(new URL(page.url()).port).not.toBe('18080');
	await expect(page.locator('main, body')).toBeVisible({ timeout: 15_000 });
});
