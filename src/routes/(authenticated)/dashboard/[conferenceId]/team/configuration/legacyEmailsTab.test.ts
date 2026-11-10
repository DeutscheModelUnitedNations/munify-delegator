import { describe, expect, test } from 'vitest';
import { emailsPageForLegacyTab } from './legacyEmailsTab';

const at = (path: string) => new URL(path, 'https://delegator.example');

describe('emailsPageForLegacyTab', () => {
	test('sends the former e-mail tab to the e-mail page', () => {
		expect(emailsPageForLegacyTab(at('/dashboard/c1/team/configuration?tab=emails'))).toBe(
			'/dashboard/c1/team/emails'
		);
	});

	test('keeps the locale prefix and copes with a trailing slash', () => {
		expect(emailsPageForLegacyTab(at('/en/dashboard/c1/team/configuration/?tab=emails'))).toBe(
			'/en/dashboard/c1/team/emails'
		);
	});

	test('leaves the other tabs and the plain settings alone', () => {
		expect(emailsPageForLegacyTab(at('/dashboard/c1/team/configuration?tab=general'))).toBe(
			undefined
		);
		expect(emailsPageForLegacyTab(at('/dashboard/c1/team/configuration'))).toBe(undefined);
	});
});
