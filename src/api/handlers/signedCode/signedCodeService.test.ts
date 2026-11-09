import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/private', () => ({ CERTIFICATE_SECRET: 'a secret that only this test uses' }));

const { issueCertificateCode, issueLiveCode, issuePrintCode, scannedUserId, verifyCode } =
	await import('./signedCodeService');

const NOW = Date.UTC(2026, 10, 8, 9, 0, 0);

describe('issued codes', () => {
	test('a nametag code verifies and names its holder and conference', async () => {
		const code = await issueLiveCode({ userId: 'alice', conferenceId: 'mun', now: NOW });
		expect(await verifyCode({ text: code, now: NOW + 1000 })).toMatchObject({
			valid: true,
			claims: { kind: 'live', userId: 'alice', conferenceId: 'mun' }
		});
	});

	test('a certificate code states what was certified', async () => {
		const certificate = { n: 'Ada', t: 'MUN', s: 1, e: 2 };
		const code = await issueCertificateCode({ certificate, now: NOW });
		expect(await verifyCode({ text: code, now: NOW })).toMatchObject({
			valid: true,
			claims: { kind: 'certificate', certificate }
		});
	});

	test('the keys survive a restart: a code issued before still verifies', async () => {
		const code = await issuePrintCode({ userId: 'alice', conferenceId: 'mun', now: NOW });
		vi.resetModules();
		const reloaded = await import('./signedCodeService');
		expect(await reloaded.verifyCode({ text: code })).toMatchObject({ valid: true });
	});
});

describe('the user a scan leads to', () => {
	test('a genuine code of an accepted kind leads to its holder', async () => {
		const code = await issueLiveCode({ userId: 'alice', conferenceId: 'mun' });
		expect(await scannedUserId({ code, conferenceId: 'mun', kinds: ['live'] })).toBe('alice');
	});

	test('anything that is no signed code is the user id it is', async () => {
		expect(await scannedUserId({ code: 'alice', conferenceId: 'mun', kinds: ['live'] })).toBe(
			'alice'
		);
	});

	test('a code of another kind or conference is refused', async () => {
		const code = await issuePrintCode({ userId: 'alice', conferenceId: 'mun' });
		await expect(scannedUserId({ code, conferenceId: 'mun', kinds: ['live'] })).rejects.toThrow();
		await expect(
			scannedUserId({ code, conferenceId: 'other', kinds: ['print'] })
		).rejects.toThrow();
	});

	test('an expired nametag code is refused', async () => {
		const code = await issueLiveCode({
			userId: 'alice',
			conferenceId: 'mun',
			now: Date.now() - 60 * 60 * 1000
		});
		await expect(scannedUserId({ code, conferenceId: 'mun', kinds: ['live'] })).rejects.toThrow();
	});
});
