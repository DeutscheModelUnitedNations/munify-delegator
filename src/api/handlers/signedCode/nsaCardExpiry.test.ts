import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/private', () => ({ CERTIFICATE_SECRET: 'a secret that only this test uses' }));
const { nsaCardExpiry } = await import('./signedCodeService');

describe('nsaCardExpiry', () => {
	test('a card counts until the end of the day after the conference ends', () => {
		const expiry = nsaCardExpiry(new Date(Date.UTC(2027, 2, 4, 15, 0)));
		expect(new Date(expiry * 1000).toISOString()).toBe('2027-03-06T00:00:00.000Z');
	});
});
