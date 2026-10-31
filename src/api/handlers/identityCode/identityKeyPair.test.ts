import { describe, expect, test, vi } from 'vitest';
import { IDENTITY_CODE_VALIDITY_MS, verifyIdentityCode } from '#lib/helpers/identityCode';

vi.mock('$app/env/private', () => ({ CERTIFICATE_SECRET: 'a secret that only this test uses' }));

const { identityPublicKey, issueIdentityCode } = await import('./identityKeyPair');

const NOW = Date.UTC(2026, 9, 10, 9, 0, 0);

describe('identity codes', () => {
	test('a code the deployment issued verifies and names its owner', async () => {
		const code = await issueIdentityCode({ userId: 'user.with.dots', now: NOW });
		expect(
			await verifyIdentityCode({ code, publicKey: await identityPublicKey(), now: NOW + 1000 })
		).toEqual({
			valid: true,
			userId: 'user.with.dots'
		});
	});

	test('a code for another id, built by hand, is forged', async () => {
		const code = await issueIdentityCode({ userId: 'alice', now: NOW });
		const forged = code.replace('MUN1.alice.', 'MUN1.bob.');
		expect(
			await verifyIdentityCode({ code: forged, publicKey: await identityPublicKey(), now: NOW })
		).toEqual({
			valid: false,
			reason: 'forged'
		});
	});

	test('a bare user id is not a code', async () => {
		expect(
			await verifyIdentityCode({ code: 'alice', publicKey: await identityPublicKey(), now: NOW })
		).toEqual({
			valid: false,
			reason: 'malformed'
		});
	});

	test('a code stops counting after its validity, and is not accepted from far ahead', async () => {
		const code = await issueIdentityCode({ userId: 'alice', now: NOW });
		const key = await identityPublicKey();
		expect(
			await verifyIdentityCode({
				code,
				publicKey: key,
				now: NOW + IDENTITY_CODE_VALIDITY_MS + 2000
			})
		).toEqual({
			valid: false,
			reason: 'expired'
		});
		expect(await verifyIdentityCode({ code, publicKey: key, now: NOW - 10 * 60 * 1000 })).toEqual({
			valid: false,
			reason: 'expired'
		});
	});

	test('a code typed in by a keyboard scanner still verifies, whatever the case of its signature', async () => {
		const code = await issueIdentityCode({ userId: 'alice', now: NOW });
		const [prefix, userId, time, signature] = code.split('.');
		const typed = [prefix, userId, time.toLowerCase(), signature.toLowerCase()].join('.');
		expect(
			await verifyIdentityCode({ code: typed, publicKey: await identityPublicKey(), now: NOW })
		).toEqual({
			valid: true,
			userId: 'alice'
		});
	});

	test('the signature and time are written in layout-safe letters only', async () => {
		const code = await issueIdentityCode({ userId: 'alice', now: NOW });
		const [, , time, signature] = code.split('.');
		expect(`${time}${signature}`).toMatch(/^[0-9A-HJ-NP-X]+$/);
	});
});
