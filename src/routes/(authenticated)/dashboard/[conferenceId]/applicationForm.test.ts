import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/public', () => ({
	PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH: 100,
	PUBLIC_MAX_APPLICATION_TEXT_LENGTH: 1000
}));

const { makeApplicationForm } = await import('./applicationForm');

describe('makeApplicationForm', () => {
	test('seeds the answers of an application', () => {
		const form = makeApplicationForm({
			school: { id: 'school-1', name: 'Gymnasium Kiel' },
			experience: 'Two conferences',
			motivation: 'Debate'
		});
		expect(form.data).toEqual({
			schoolId: 'school-1',
			schoolName: 'Gymnasium Kiel',
			experience: 'Two conferences',
			motivation: 'Debate'
		});
	});

	test('starts empty where nothing was answered yet', () => {
		expect(makeApplicationForm({ school: null, experience: null }).data).toEqual({
			schoolId: null,
			schoolName: '',
			experience: '',
			motivation: ''
		});
	});
});
