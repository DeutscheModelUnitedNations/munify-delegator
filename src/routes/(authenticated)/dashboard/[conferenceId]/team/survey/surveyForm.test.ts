import { describe, expect, test } from 'vitest';
import { datetimeLocalToDate } from '#lib/helpers/conferenceTimezoneDate';
import { surveyFields } from './surveyForm';

describe('surveyFields', () => {
	test('needs a title, a description and a deadline', () => {
		expect(
			surveyFields({ title: '', description: 'd', deadline: '2026-03-12T10:00', timezone: 'UTC' })
		).toBeUndefined();
		expect(
			surveyFields({ title: 't', description: '', deadline: '2026-03-12T10:00', timezone: 'UTC' })
		).toBeUndefined();
		expect(
			surveyFields({ title: 't', description: 'd', deadline: '', timezone: 'UTC' })
		).toBeUndefined();
	});

	test('reads the deadline in the conference timezone', () => {
		expect(
			surveyFields({
				title: 't',
				description: 'd',
				deadline: '2026-03-12T10:00',
				timezone: 'Europe/Berlin'
			})
		).toEqual({
			title: 't',
			description: 'd',
			deadline: datetimeLocalToDate({
				datetimeLocal: '2026-03-12T10:00',
				timezone: 'Europe/Berlin'
			})
		});
	});
});
