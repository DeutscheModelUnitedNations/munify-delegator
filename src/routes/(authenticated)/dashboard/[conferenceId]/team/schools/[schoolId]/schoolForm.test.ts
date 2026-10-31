import { describe, expect, test } from 'vitest';
import { schoolFormSchema, toUpdateSchoolArgs } from './schoolForm';

describe('schoolFormSchema', () => {
	test('takes a school without country or region, as the country select leaves them null', () => {
		expect(
			schoolFormSchema.safeParse({ name: 'Gymnasium Kiel', country: null, region: null }).success
		).toBe(true);
	});

	test('needs a name', () => {
		expect(schoolFormSchema.safeParse({ name: '  ' }).success).toBe(false);
	});

	test('takes empty contact fields, which clear them', () => {
		expect(
			schoolFormSchema.safeParse({ name: 'Gymnasium Kiel', contactName: '', contactPhone: ' ' })
				.success
		).toBe(true);
	});

	test('refuses a contact name or phone the API scalars would refuse', () => {
		expect(
			schoolFormSchema.safeParse({ name: 'Gymnasium Kiel', contactName: 'Sekretariat (Raum 3)' })
				.success
		).toBe(false);
		expect(
			schoolFormSchema.safeParse({ name: 'Gymnasium Kiel', contactPhone: '12345' }).success
		).toBe(false);
	});

	test('takes a contact the API scalars take', () => {
		expect(
			schoolFormSchema.safeParse({
				name: 'Gymnasium Kiel',
				contactName: 'Dr. Anna Müller-Lüdenscheidt',
				contactPhone: '+49 431 123456'
			}).success
		).toBe(true);
	});
});

describe('toUpdateSchoolArgs', () => {
	test('clears empty fields and trims the rest', () => {
		expect(
			toUpdateSchoolArgs({
				id: 's1',
				values: {
					name: ' Gymnasium Kiel ',
					country: null,
					notes: ' kommt jedes Jahr ',
					city: ''
				}
			})
		).toMatchObject({
			id: 's1',
			name: 'Gymnasium Kiel',
			country: null,
			city: null,
			notes: 'kommt jedes Jahr'
		});
	});
});
