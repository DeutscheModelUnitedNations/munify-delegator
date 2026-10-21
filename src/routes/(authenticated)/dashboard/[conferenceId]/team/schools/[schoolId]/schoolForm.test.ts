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
});

describe('toUpdateSchoolArgs', () => {
	test('clears empty fields and trims the rest', () => {
		expect(
			toUpdateSchoolArgs('s1', {
				name: ' Gymnasium Kiel ',
				country: null,
				notes: ' kommt jedes Jahr ',
				city: ''
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
