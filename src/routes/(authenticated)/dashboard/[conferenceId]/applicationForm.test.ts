import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/public', () => ({
	PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH: 100,
	PUBLIC_MAX_APPLICATION_TEXT_LENGTH: 1000
}));

const { makeApplicationForm } = await import('./applicationForm');

describe('makeApplicationForm', () => {
	test('seeds the texts of an application', () => {
		const form = makeApplicationForm({
			experience: 'Two conferences',
			motivation: 'Debate'
		});
		expect(form.data).toEqual({
			experience: 'Two conferences',
			motivation: 'Debate'
		});
	});

	test('starts empty where nothing was answered yet', () => {
		expect(makeApplicationForm({ experience: null }).data).toEqual({
			experience: '',
			motivation: ''
		});
	});
});
