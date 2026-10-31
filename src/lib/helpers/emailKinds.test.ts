import { describe, expect, test } from 'vitest';
import { settingsEmailKinds } from './emailKinds';

describe('settingsEmailKinds', () => {
	test('offers the mails the changed settings can make due', () => {
		expect(settingsEmailKinds(['unlockPostals', 'title'])).toEqual(['POSTAL_UNLOCKED']);
		expect(settingsEmailKinds(['unlockPayments', 'unlockPostals'])).toEqual([
			'POSTAL_UNLOCKED',
			'PAYMENT_UNLOCKED'
		]);
	});

	test('names each mail once', () => {
		expect(settingsEmailKinds(['state', 'certificateBasePDF'])).toEqual(['CERTIFICATE_AVAILABLE']);
	});

	test('offers nothing for settings that owe nobody a mail', () => {
		expect(settingsEmailKinds(['title', 'location', 'email:POSTAL_UNLOCKED'])).toEqual([]);
	});
});
