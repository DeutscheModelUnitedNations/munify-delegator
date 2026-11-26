import { afterEach, describe, expect, it, vi } from 'vitest';
import { bankPaymentSyncConfig } from './config';

const credentials = {
	BUCHHALTUNGSBUTLER_API_CLIENT: 'client',
	BUCHHALTUNGSBUTLER_API_SECRET: 'secret',
	BUCHHALTUNGSBUTLER_API_KEY: 'key'
};

describe('bankPaymentSyncConfig', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	function stub(env: Record<string, string>) {
		for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
	}

	it('defaults to BuchhaltungsButler over https', () => {
		stub(credentials);
		vi.stubEnv('BUCHHALTUNGSBUTLER_API_URL', undefined);
		expect(bankPaymentSyncConfig()).toEqual({
			baseUrl: 'https://webapp.buchhaltungsbutler.de/api/v1',
			apiClient: 'client',
			apiSecret: 'secret',
			apiKey: 'key'
		});
	});

	it('refuses a URL without TLS, which would send the secret and key in the clear', () => {
		stub({
			...credentials,
			BUCHHALTUNGSBUTLER_API_URL: 'http://webapp.buchhaltungsbutler.de/api/v1'
		});
		expect(() => bankPaymentSyncConfig()).toThrow('BUCHHALTUNGSBUTLER_API_URL');
	});

	it('names every missing credential at once', () => {
		vi.stubEnv('BUCHHALTUNGSBUTLER_API_CLIENT', '');
		vi.stubEnv('BUCHHALTUNGSBUTLER_API_SECRET', '');
		vi.stubEnv('BUCHHALTUNGSBUTLER_API_KEY', '');
		expect(() => bankPaymentSyncConfig()).toThrow(/API_CLIENT[\s\S]*API_SECRET[\s\S]*API_KEY/);
	});
});
