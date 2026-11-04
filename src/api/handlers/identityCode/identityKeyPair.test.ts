import { describe, expect, test, vi } from 'vitest';
import {
	IDENTITY_CODE_VALIDITY_MS,
	identityCardExpiry,
	verifyIdentityCard,
	verifyIdentityCode
} from '#lib/helpers/identityCode';

vi.mock('$app/env/private', () => ({ CERTIFICATE_SECRET: 'a secret that only this test uses' }));

const { identityPublicKey, issueIdentityCard, issueIdentityCode } =
	await import('./identityKeyPair');

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

describe('NSA cards', () => {
	const expiresAtSeconds = identityCardExpiry(new Date(Date.UTC(2026, 9, 12)));
	const card = { userId: 'user.with.dots', conferenceId: 'conf', expiresAtSeconds, cardNumber: 3 };

	test('a card verifies for its conference and names its owner and number', async () => {
		const code = await issueIdentityCard(card);
		expect(
			await verifyIdentityCard({
				code,
				publicKey: await identityPublicKey(),
				conferenceId: 'conf',
				now: NOW
			})
		).toEqual({ valid: true, userId: 'user.with.dots', conferenceId: 'conf', cardNumber: 3 });
	});

	test('a card counts until the day after the conference ends, then expires', async () => {
		const code = await issueIdentityCard(card);
		const check = (now: number) =>
			identityPublicKey().then((publicKey) =>
				verifyIdentityCard({ code, publicKey, conferenceId: 'conf', now })
			);
		expect((await check(Date.UTC(2026, 9, 13, 23, 59))).valid).toBe(true);
		expect(await check(Date.UTC(2026, 9, 14, 0, 1))).toEqual({ valid: false, reason: 'expired' });
	});

	test('a card is refused at another conference', async () => {
		const code = await issueIdentityCard(card);
		expect(
			await verifyIdentityCard({
				code,
				publicKey: await identityPublicKey(),
				conferenceId: 'other',
				now: NOW
			})
		).toEqual({ valid: false, reason: 'otherConference' });
	});

	test('a card with a raised number, built by hand, is forged', async () => {
		const code = await issueIdentityCard(card);
		const parts = code.split('.');
		const raised = await issueIdentityCard({ ...card, cardNumber: 4 });
		parts[parts.length - 2] = raised.split('.').at(-2) ?? '';
		expect(
			await verifyIdentityCard({
				code: parts.join('.'),
				publicKey: await identityPublicKey(),
				conferenceId: 'conf',
				now: NOW
			})
		).toEqual({ valid: false, reason: 'forged' });
	});

	test('a nametag is not a card, and a card is not a nametag', async () => {
		const publicKey = await identityPublicKey();
		const nametag = await issueIdentityCode({ userId: 'alice', now: NOW });
		const code = await issueIdentityCard(card);
		expect(
			await verifyIdentityCard({ code: nametag, publicKey, conferenceId: 'conf', now: NOW })
		).toEqual({ valid: false, reason: 'malformed' });
		expect(await verifyIdentityCode({ code, publicKey, now: NOW })).toEqual({
			valid: false,
			reason: 'malformed'
		});
	});
});
