import { afterEach, describe, expect, it, vi } from 'vitest';
import { readAppVariable } from './appEnv';

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('readAppVariable', () => {
	it('answers the value as its schema in src/env.ts makes it', () => {
		vi.stubEnv('SMTP_PORT', '2525');
		vi.stubEnv('SMTP_SECURE', 'true');
		expect(readAppVariable('SMTP_PORT')).toBe(2525);
		expect(readAppVariable('SMTP_SECURE')).toBe(true);
	});

	it('falls back to the default of an unset variable', () => {
		vi.stubEnv('SMTP_FROM_NAME', undefined);
		expect(readAppVariable('SMTP_FROM_NAME')).toBe('MUNify Delegator');
	});

	it('refuses an invalid value, naming the variable', () => {
		vi.stubEnv('SMTP_FROM_ADDRESS', 'not an address');
		expect(() => readAppVariable('SMTP_FROM_ADDRESS')).toThrow(/SMTP_FROM_ADDRESS/);
	});
});
