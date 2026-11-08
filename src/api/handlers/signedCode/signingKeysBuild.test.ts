import { expect, test, vi } from 'vitest';

// What `vite build` hands the module while it analyses the routes: the placeholder, not a secret.
vi.mock('$app/env/private', () => ({ CERTIFICATE_SECRET: '' }));

test('loading the module derives no key, so a build without the secret passes', async () => {
	const module = await import('./signingKeys');
	// A key derived at load would reject here with "Zero-length key is not supported", which
	// vitest reports as an unhandled rejection after the test.
	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(module.signedCodeKeys).toBeTypeOf('function');
});
