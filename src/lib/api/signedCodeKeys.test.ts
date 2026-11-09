import { beforeEach, describe, expect, test, vi } from 'vitest';

const signedCodeKeys = vi.fn();
vi.mock('#lib/api/rumbleClient/client', () => ({ client: { query: { signedCodeKeys } } }));

beforeEach(() => {
	vi.resetModules();
	signedCodeKeys.mockReset();
	localStorage.clear();
});

const load = async () => (await import('./signedCodeKeys')).loadSignedCodeKeys();

describe('loadSignedCodeKeys', () => {
	test('fetches the keys once and keeps them for the next page load', async () => {
		signedCodeKeys.mockResolvedValue([{ kid: 1, publicKey: 'key-1' }]);
		expect(await load()).toEqual(new Map([[1, 'key-1']]));

		vi.resetModules();
		signedCodeKeys.mockRejectedValue(new Error('offline'));
		expect(await load()).toEqual(new Map([[1, 'key-1']]));
	});

	test('fails offline when no keys were kept, or only unreadable ones', async () => {
		signedCodeKeys.mockRejectedValue(new Error('offline'));
		await expect(load()).rejects.toThrow('offline');

		localStorage.setItem('signedCodeKeys', JSON.stringify([{ kid: 'one' }]));
		vi.resetModules();
		await expect(load()).rejects.toThrow('offline');

		localStorage.setItem('signedCodeKeys', '{not json');
		vi.resetModules();
		await expect(load()).rejects.toThrow('offline');
	});
});
