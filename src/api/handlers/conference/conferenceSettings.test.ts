import { describe, expect, it } from 'vitest';

import { defaultLayout } from '#lib/helpers/documentLayout';
import { m } from '#lib/paraglide/messages';
import { conferenceSettingSchemas, documentLayoutArgsSchema } from './conferenceSettings';

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

describe('documentLayoutArgsSchema', () => {
	const args = (layout: unknown) => ({ conferenceId: 'c1', document: 'certificate', layout });

	it('takes a layout that places every element of its document', () => {
		const layout = defaultLayout('certificate');
		const parsed = documentLayoutArgsSchema.safeParse(args(layout));
		expect(parsed.success && parsed.data.layout).toEqual(layout);
	});

	it('clears the layout when it is left out or null', () => {
		for (const layout of [undefined, null]) {
			const parsed = documentLayoutArgsSchema.safeParse(args(layout));
			expect(parsed.success && parsed.data.layout).toBeNull();
		}
	});

	it('refuses a layout that misses an element or places one off the page', () => {
		const { qr: _qr, ...withoutQr } = defaultLayout('certificate');
		const offPage = { ...defaultLayout('certificate'), qr: { x: 2, y: 0, size: 0.1 } };
		for (const layout of [withoutQr, offPage, 'not a layout']) {
			const parsed = documentLayoutArgsSchema.safeParse(args(layout));
			expect(parsed.error?.issues.map((issue) => issue.message)).toEqual([
				m.documentLayoutInvalid()
			]);
		}
	});

	it("refuses another document's layout", () => {
		const parsed = documentLayoutArgsSchema.safeParse(args(defaultLayout('guardianConsent')));
		expect(parsed.success).toBe(false);
	});

	it('refuses a document that has no layout', () => {
		const parsed = documentLayoutArgsSchema.safeParse({
			conferenceId: 'c1',
			document: 'invoice',
			layout: null
		});
		expect(parsed.success).toBe(false);
	});
});
