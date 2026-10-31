import { describe, expect, it } from 'vitest';

import { conferenceSettingSchemas } from './conferenceSettings';

const accepts = (schema: { safeParse: (value: unknown) => { success: boolean } }, value: unknown) =>
	schema.safeParse(value).success;

describe('conferenceSettingSchemas', () => {
	it('takes known time zones only', () => {
		expect(accepts(conferenceSettingSchemas.timezone, 'Europe/Berlin')).toBe(true);
		expect(accepts(conferenceSettingSchemas.timezone, 'UTC')).toBe(true);
		expect(accepts(conferenceSettingSchemas.timezone, 'Mars/Olympus_Mons')).toBe(false);
	});

	it('takes a grace period of zero or more whole minutes', () => {
		const schema = conferenceSettingSchemas.registrationDeadlineGracePeriodMinutes;
		expect(accepts(schema, 0)).toBe(true);
		expect(accepts(schema, 30)).toBe(true);
		expect(accepts(schema, -1)).toBe(false);
		expect(accepts(schema, 1.5)).toBe(false);
	});

	it('refuses a negative fee and a currency that is not three letters', () => {
		expect(accepts(conferenceSettingSchemas.feeAmount, 0)).toBe(true);
		expect(accepts(conferenceSettingSchemas.feeAmount, -5)).toBe(false);
		expect(accepts(conferenceSettingSchemas.currency, 'EUR')).toBe(true);
		expect(accepts(conferenceSettingSchemas.currency, 'EURO')).toBe(false);
	});

	it('leaves out and clears every setting', () => {
		for (const schema of Object.values(conferenceSettingSchemas)) {
			expect(accepts(schema, undefined)).toBe(true);
			expect(accepts(schema, null)).toBe(true);
		}
	});
});
