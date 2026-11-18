// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/private', () => ({ CERTIFICATE_SECRET: 'a secret only the tests know' }));

const { decryptSlackToken, encryptSlackToken } = await import('./slackToken');

describe('a Slack token at rest', () => {
	test('comes back as it went in', async () => {
		const sealed = await encryptSlackToken('xoxb-123-abc');
		expect(await decryptSlackToken(sealed)).toBe('xoxb-123-abc');
	});

	test('is not readable in the database, and never sealed the same way twice', async () => {
		const [first, second] = await Promise.all([
			encryptSlackToken('xoxb-123-abc'),
			encryptSlackToken('xoxb-123-abc')
		]);
		expect(first).not.toContain('xoxb');
		expect(Buffer.from(first, 'base64').toString('latin1')).not.toContain('xoxb-123-abc');
		expect(first).not.toBe(second);
	});

	test('refuses a ciphertext somebody changed', async () => {
		const bytes = Buffer.from(await encryptSlackToken('xoxb-123-abc'), 'base64');
		bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 1;
		await expect(decryptSlackToken(bytes.toString('base64'))).rejects.toThrow();
	});
});
